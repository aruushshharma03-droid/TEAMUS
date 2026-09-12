import { NextResponse } from "next/server";
import { MoneyError } from "./types";

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}

export function fail(code: string, message: string, status = 400) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export function handleError(e: unknown) {
  if (e instanceof MoneyError) {
    const status =
      e.code === "FORBIDDEN" ? 403 : e.code === "NOT_FOUND" ? 404 : 400;
    return fail(e.code, e.message, status);
  }
  if (e instanceof Error && e.message === "UNAUTHENTICATED") {
    return fail("UNAUTHENTICATED", "Sign in required", 401);
  }
  console.error(e);
  return fail("INTERNAL", "Something went wrong", 500);
}
