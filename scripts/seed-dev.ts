// Demo data for local development: `npm run db:seed:dev` (also run by `npm run dev:up`).
// Idempotent — does nothing if the demo user already exists. Log in as demo@local / demo1234.
import { createArea } from '../src/db/queries/areas';
import { createItem } from '../src/db/queries/items';
import { findOrCreateTag } from '../src/db/queries/tags';
import { createUserWithHousehold, getUserByEmail } from '../src/db/queries/users';
import { hashPassword } from '../src/lib/passwordHash';

type Dims = [number, number, number] | null;
const d = (dims: Dims) => ({ widthCm: dims?.[0] ?? null, depthCm: dims?.[1] ?? null, heightCm: dims?.[2] ?? null });

async function main() {
  if (await getUserByEmail('demo@local')) {
    console.log('Demo data already present (demo@local).');
    return;
  }
  await createUserWithHousehold({
    email: 'demo@local',
    passwordHash: hashPassword('demo1234'),
    name: 'Demo',
    locale: 'el',
    householdName: 'Σπίτι Demo',
  });
  const user = (await getUserByEmail('demo@local'))!;
  const hh = user.activeHouseholdId!;

  const area = (name: string, parentId: number | null, dims: Dims, address: string | null = null) =>
    createArea(hh, { name, parentId, description: null, address, photos: [], ...d(dims) });

  const home = await area('Σπίτι', null, null, 'Οδός Αθηνάς 10, Αθήνα');
  const storage = await area('Αποθήκη', home, [300, 200, 250]);
  const shelf = await area('Ράφι 2', storage, [120, 40, 180]);
  const blueBox = await area('Μπλε κουτί', shelf, [60, 40, 40]);
  const xmasBox = await area('Κουτί Χριστουγέννων', storage, [80, 60, 50]);
  const kitchen = await area('Κουζίνα', home, null);
  const drawer = await area('Συρτάρι μπαχαρικών', kitchen, [50, 45, 15]);
  const warehouse = await area('Warehouse', null, [800, 550, 300], 'Λεωφ. Πάρνηθος 12, Αχαρνές');
  const room1 = await area('Room 1', warehouse, [400, 300, 300]);
  const pallet = await area('Pallet A', room1, [120, 100, 150]);

  const tools = (await findOrCreateTag(hh, 'Εργαλεία')).id;
  const xmas = (await findOrCreateTag(hh, 'Χριστούγεννα')).id;
  const docs = (await findOrCreateTag(hh, 'Documents')).id;

  const item = (name: string, areaId: number | null, quantity: number, dims: Dims, tagIds: number[] = [], description: string | null = null) =>
    createItem(hh, { name, areaId, quantity, description, tagIds, photos: [], ...d(dims) });

  await item('Δράπανο μπαταρίας', blueBox, 1, [30, 25, 10], [tools], 'Makita, με 2 μπαταρίες');
  await item('Κατσαβίδια', blueBox, 6, [20, 3, 3], [tools]);
  await item('Μπαταρίες AA', blueBox, 24, [5, 1, 1]);
  await item('Σετ καρυδάκια', shelf, 1, [40, 20, 8], [tools]);
  await item('Σκάλα', storage, 1, [50, 15, 180]);
  await item('Χριστουγεννιάτικα λαμπάκια', xmasBox, 3, [30, 20, 10], [xmas]);
  await item('Στολίδια', xmasBox, 40, [8, 8, 8], [xmas], 'Γυάλινα — προσοχή');
  await item('Κουκουνάρι', drawer, 1, [10, 10, 12]);
  await item('Κανέλα', drawer, 2, null);
  await item('Tent', pallet, 1, [70, 25, 25]);
  await item('Camping chairs', pallet, 4, [90, 15, 60]);
  await item('Winter tyres', room1, 4, [65, 65, 21]);
  await item('Passports', null, 3, null, [docs], 'Lent to Nikos for the trip');
  console.log('Demo data created. Log in as demo@local / demo1234');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
