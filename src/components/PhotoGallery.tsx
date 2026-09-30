/** Swipeable row of large photos (CSS scroll-snap, no JS). */
export function PhotoGallery({ urls, alt }: { urls: string[]; alt: string }) {
  return (
    <div className="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4">
      {urls.map((url, i) => (
        <a key={url + i} href={url} target="_blank" rel="noreferrer" className="shrink-0 snap-center">
          <img
            src={url}
            alt={i === 0 ? alt : ''}
            className={`h-64 rounded-2xl bg-surface-2 object-cover ${urls.length === 1 ? 'w-[calc(100vw-2rem)] max-w-2xl' : 'w-[80vw] max-w-md'}`}
          />
        </a>
      ))}
    </div>
  );
}
