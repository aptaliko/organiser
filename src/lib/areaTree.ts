// Pure helpers over a household's flat list of areas (one household is small enough to
// load whole). Every walk is cycle-safe, even though the API never lets a cycle be created.

export interface AreaNodeInput {
  id: number;
  parentId: number | null;
  name: string;
  address?: string | null;
}

export type TreeNode<T extends AreaNodeInput> = T & { children: TreeNode<T>[] };

const collator = new Intl.Collator(['el', 'en'], { sensitivity: 'base', numeric: true });
export const byName = (a: { name: string }, b: { name: string }) => collator.compare(a.name, b.name);

/** Nested tree, siblings sorted by name. Areas whose parent is missing become roots. */
export function buildTree<T extends AreaNodeInput>(areas: T[]): TreeNode<T>[] {
  const nodes = new Map<number, TreeNode<T>>(areas.map((a) => [a.id, { ...a, children: [] }]));
  const roots: TreeNode<T>[] = [];
  for (const node of nodes.values()) {
    const parent = node.parentId != null ? nodes.get(node.parentId) : undefined;
    if (parent && parent !== node) parent.children.push(node);
    else roots.push(node);
  }
  const sortRec = (list: TreeNode<T>[]) => {
    list.sort(byName);
    list.forEach((n) => sortRec(n.children));
  };
  sortRec(roots);
  return roots;
}

/** Ancestors root→…→self. Empty if `id` is unknown. */
export function pathTo<T extends AreaNodeInput>(areas: T[] | Map<number, T>, id: number): T[] {
  const byId = areas instanceof Map ? areas : new Map(areas.map((a) => [a.id, a]));
  const path: T[] = [];
  const seen = new Set<number>();
  let current = byId.get(id);
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    path.unshift(current);
    current = current.parentId != null ? byId.get(current.parentId) : undefined;
  }
  return path;
}

/** `id` and every area below it. */
export function descendantIds(areas: AreaNodeInput[], id: number): Set<number> {
  const children = new Map<number, number[]>();
  for (const a of areas) {
    if (a.parentId == null) continue;
    children.set(a.parentId, [...(children.get(a.parentId) ?? []), a.id]);
  }
  const result = new Set<number>([id]);
  const stack = [id];
  while (stack.length) {
    for (const child of children.get(stack.pop()!) ?? []) {
      if (!result.has(child)) {
        result.add(child);
        stack.push(child);
      }
    }
  }
  return result;
}

/** Would making `newParentId` the parent of `id` put `id` inside itself? */
export function wouldCreateCycle(areas: AreaNodeInput[], id: number, newParentId: number | null): boolean {
  return newParentId !== null && descendantIds(areas, id).has(newParentId);
}

/** Nearest non-empty address walking up from `id` (children inherit the top-level address). */
export function effectiveAddress(areas: AreaNodeInput[], id: number): string | null {
  const path = pathTo(areas, id);
  for (let i = path.length - 1; i >= 0; i--) {
    const address = path[i].address?.trim();
    if (address) return address;
  }
  return null;
}

/** "Warehouse → Room 2 → Blue box". */
export function formatPath(path: { name: string }[]): string {
  return path.map((a) => a.name).join(' → ');
}
