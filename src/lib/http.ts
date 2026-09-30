import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

/** Throw from anywhere inside a `handle()`d route to produce that status. */
export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    public details?: unknown,
  ) {
    super(code);
  }
}

// 404, never 403, for anything outside the caller's household: don't leak that an id exists.
export const notFound = () => new HttpError(404, 'not_found');
export const badRequest = (code = 'bad_request', details?: unknown) => new HttpError(400, code, details);

/** Postgres unique_violation. */
export function isUniqueViolation(err: unknown): boolean {
  const e = err as { code?: string; cause?: { code?: string } };
  return e?.code === '23505' || e?.cause?.code === '23505';
}

type Handler<C> = (request: Request, context: C) => Promise<Response>;

/** Maps HttpError / ZodError to JSON responses; anything else is a logged 500. */
export function handle<C>(fn: Handler<C>): Handler<C> {
  return async (request, context) => {
    try {
      return await fn(request, context);
    } catch (err) {
      if (err instanceof HttpError) {
        return NextResponse.json({ error: err.code, details: err.details }, { status: err.status });
      }
      if (err instanceof ZodError) {
        return NextResponse.json({ error: 'invalid', details: err.issues }, { status: 400 });
      }
      console.error(err);
      return NextResponse.json({ error: 'server_error' }, { status: 500 });
    }
  };
}

/** Parses a positive integer id from a route param, 404 otherwise. */
export function parseId(raw: string): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) throw notFound();
  return id;
}
