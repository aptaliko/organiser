// Runs as part of `npm run build`. On Vercel *production* builds it applies pending database
// migrations before `next build`, so schema changes ship with the code and the database
// credentials never leave Vercel. Everywhere else (preview deployments, local builds) it
// does nothing — a test branch must never change the production database.
if (process.env.VERCEL_ENV === 'production') {
  console.log('Production build: applying database migrations…');
  void import('./migrate');
} else {
  console.log(`Skipping database migrations (VERCEL_ENV=${process.env.VERCEL_ENV ?? 'unset'}).`);
}
