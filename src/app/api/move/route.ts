import { NextResponse } from 'next/server';
import { getArea, listAreas } from '@/db/queries/areas';
import { executeItemMoves, getItemNamesIn, getMovableItems, moveAreas } from '@/db/queries/moves';
import { unreferencedUrls } from '@/db/queries/photos';
import { wouldCreateCycle } from '@/lib/areaTree';
import { requireHousehold } from '@/lib/household';
import { badRequest, handle, HttpError, notFound } from '@/lib/http';
import { MovePlanError, planItemMoves } from '@/lib/moveItems';
import { deleteStoredPhotos } from '@/lib/photoStorage';
import { moveSchema, type MoveBody } from '@/lib/schemas';

function groupBy<T, K>(list: T[], key: (t: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const t of list) map.set(key(t), [...(map.get(key(t)) ?? []), t]);
  return map;
}

/**
 * Moves items (whole, part of a quantity, or merged into a same-named item) and/or places
 * into `targetAreaId` (null = Unplaced for items, top level for places). Responds with the
 * requests that undo it, or `undo: null` when a merge makes it not cleanly reversible.
 */
export const POST = handle(async (request) => {
  const { householdId } = await requireHousehold(request);
  const body = moveSchema.parse(await request.json());
  const target = body.targetAreaId;
  if (target !== null && !(await getArea(householdId, target))) throw notFound();

  // Places: all must be ours, and none may end up inside itself.
  const allAreas = body.areas.length ? await listAreas(householdId) : [];
  const areaById = new Map(allAreas.map((a) => [a.id, a]));
  const movingAreas = [...new Set(body.areas)].map((id) => areaById.get(id));
  if (movingAreas.some((a) => !a)) throw notFound();
  if (movingAreas.some((a) => wouldCreateCycle(allAreas, a!.id, target))) throw badRequest('cycle');

  // Items: all must be ours; plan splits/merges.
  const ids = body.items.map((i) => i.id);
  const found = await getMovableItems(householdId, ids);
  if (found.length !== new Set(ids).size) throw notFound();
  const byId = new Map(found.map((i) => [i.id, i]));
  let plan;
  try {
    plan = planItemMoves(
      body.items.map((r) => ({ item: byId.get(r.id)!, quantity: r.quantity })),
      target,
      await getItemNamesIn(householdId, target),
      body.mergeSameName,
    );
  } catch (err) {
    if (err instanceof MovePlanError) throw badRequest('invalid_quantity');
    throw err;
  }
  if (plan.mergeCandidates.length) throw new HttpError(409, 'merge_possible', { names: plan.mergeCandidates });

  const areasToMove = movingAreas.filter((a) => a!.parentId !== target).map((a) => a!);
  await moveAreas(householdId, areasToMove.map((a) => a.id), target);
  const { resultIds, removedUrls } = await executeItemMoves(householdId, plan.ops, target);
  if (removedUrls.length) await deleteStoredPhotos(await unreferencedUrls(removedUrls));

  // Undo = more moves: each group of things goes back where it came from.
  const undo: MoveBody[] = [];
  for (const [parentId, group] of groupBy(areasToMove, (a) => a.parentId)) {
    undo.push({ areas: group.map((a) => a.id), targetAreaId: parentId });
  }
  const relocated = plan.ops.flatMap((op) => (op.kind === 'relocate' ? [op] : []));
  for (const [from, group] of groupBy(relocated, (op) => op.fromAreaId)) {
    undo.push({ items: group.map((op) => ({ id: op.itemId })), targetAreaId: from, mergeSameName: false });
  }
  plan.ops.forEach((op, i) => {
    // A split-off row goes back and re-joins the original.
    if (op.kind === 'split') {
      undo.push({ items: [{ id: resultIds[i] }], targetAreaId: byId.get(op.fromId)!.areaId, mergeSameName: true });
    }
  });
  const reversible = !plan.ops.some((op) => op.kind === 'merge');

  return NextResponse.json({ ok: true, moved: areasToMove.length + plan.ops.length, undo: reversible ? undo : null });
});
