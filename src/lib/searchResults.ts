import { pathTo } from './areaTree';

export interface PathArea {
  id: number;
  parentId: number | null;
  name: string;
  coverUrl: string | null;
}

export interface Located {
  path: { id: number; name: string }[];
  /** The item's own photo, else the photo of the nearest place on its path that has one. */
  thumbUrl: string | null;
  /** True when thumbUrl is a place photo, not the item's. */
  thumbIsPlace: boolean;
}

/** Breadcrumb + best thumbnail for something stored in `areaId`. */
export function locate(byId: Map<number, PathArea>, areaId: number | null, ownCover: string | null): Located {
  const path = areaId === null ? [] : pathTo(byId, areaId);
  if (ownCover) return { path: path.map(({ id, name }) => ({ id, name })), thumbUrl: ownCover, thumbIsPlace: false };
  const nearest = [...path].reverse().find((a) => a.coverUrl);
  return {
    path: path.map(({ id, name }) => ({ id, name })),
    thumbUrl: nearest?.coverUrl ?? null,
    thumbIsPlace: !!nearest,
  };
}
