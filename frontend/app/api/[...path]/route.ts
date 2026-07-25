import { NextRequest, NextResponse } from "next/server";

function getBackendBase(): string {
  const configured =
    process.env.BACKEND_API_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
    (process.env.NODE_ENV === "development" ? "http://127.0.0.1:8000" : "");

  return configured.replace(/\/+$/, "");
}

async function proxyRequest(request: NextRequest) {
  const backendBase = getBackendBase();

  if (!backendBase) {
    return NextResponse.json(
      { error: "Backend URL is not configured for this deployment." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }

  const targetUrl = new URL(`${request.nextUrl.pathname}${request.nextUrl.search}`, backendBase);
  const body = ["GET", "HEAD"].includes(request.method) ? undefined : await request.text();

  const upstreamResponse = await fetch(targetUrl, {
    method: request.method,
    headers: Object.fromEntries(request.headers.entries()),
    body,
  });

  const headers = new Headers(upstreamResponse.headers);
  headers.set("x-proxy", "next");

  return new NextResponse(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers,
  });
}

export async function GET(request: NextRequest) {
  return proxyRequest(request);
}

export async function POST(request: NextRequest) {
  return proxyRequest(request);
}

export async function PUT(request: NextRequest) {
  return proxyRequest(request);
}

export async function PATCH(request: NextRequest) {
  return proxyRequest(request);
}

export async function DELETE(request: NextRequest) {
  return proxyRequest(request);
}
