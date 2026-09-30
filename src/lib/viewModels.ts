import type { AreaListRow } from '@/db/queries/areas';
import type { PickerArea } from '@/components/LocationPicker';

/** Just what the location picker needs — keeps the props sent to the client small. */
export function toPickerAreas(rows: AreaListRow[]): PickerArea[] {
  return rows.map(({ id, parentId, name, coverUrl }) => ({ id, parentId, name, coverUrl }));
}

export function mapsUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}
