import { NextResponse } from "next/server";

const UNAUTHORIZED_MESSAGE = "Unauthorized";

export function json<T extends object>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function ok<T extends object>(data: T) {
  return json(data, 200);
}

export function created<T extends object>(data: T) {
  return json(data, 201);
}

export function badRequest(message: string, code?: string) {
  return json(
    { error: message, ...(code && { code }) },
    400
  );
}

export function unauthorized(message = UNAUTHORIZED_MESSAGE) {
  return json({ error: message }, 401);
}

export function notFound(message = "Not found") {
  return json({ error: message }, 404);
}

export function conflict(message: string) {
  return json({ error: message }, 409);
}

export function serverError(message = "Internal server error") {
  return json({ error: message }, 500);
}

export function fromError(err: unknown): NextResponse {
  const message = err instanceof Error ? err.message : UNAUTHORIZED_MESSAGE;
  return unauthorized(message);
}
