import { NextResponse } from "next/server";

export function jsonOk(
  body: Record<string, unknown> = {},
  status = 200
): NextResponse {
  return NextResponse.json({ success: true, ...body }, { status });
}

export function jsonFail(
  message: string,
  status = 400,
  extra: Record<string, unknown> = {}
): NextResponse {
  return NextResponse.json({ success: false, message, ...extra }, { status });
}
