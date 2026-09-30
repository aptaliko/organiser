import { BoxIcon, ItemIcon } from './icons';

/** Square photo thumbnail, or a soft placeholder icon when there's no photo. */
export function Thumb({ url, kind, size = 48 }: { url: string | null; kind: 'area' | 'item'; size?: number }) {
  const Icon = kind === 'area' ? BoxIcon : ItemIcon;
  return (
    <span
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface-2 text-muted"
      style={{ width: size, height: size }}
    >
      {url ? (
        <img src={url} alt="" loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <Icon className="h-1/2 w-1/2" />
      )}
    </span>
  );
}
