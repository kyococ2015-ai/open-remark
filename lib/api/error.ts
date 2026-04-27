import { NextResponse } from "next/server";

export class ApiError extends Error {
  constructor(
    public readonly message: string,
    public readonly status: number = 400,
  ) {
    super(message);
  }
}

export function handleApiError(err: unknown): NextResponse {
  if (err instanceof ApiError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  console.error(err);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
