export function Logo({ size = 40 }: { size?: number }) {
  // A box with a location pin: "where is my stuff".
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <rect x="4" y="4" width="40" height="40" rx="11" fill="var(--accent)" />
      <path d="M13 21l11-6 11 6v11l-11 6-11-6z" fill="none" stroke="var(--on-accent)" strokeWidth="2.6" strokeLinejoin="round" />
      <path d="M13 21l11 6 11-6M24 27v11" fill="none" stroke="var(--on-accent)" strokeWidth="2.6" strokeLinejoin="round" />
    </svg>
  );
}
