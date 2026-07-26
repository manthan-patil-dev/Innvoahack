import { NextResponse, type NextRequest } from "next/server";

/**
 * Same-origin proxy to the LifeCore backend.
 *
 * The browser calls `/api/chat` on this deployment; this forwards it to Render
 * server-side. That removes CORS from the picture entirely — there is no
 * cross-origin request left to preflight — and keeps the backend URL out of the
 * client bundle.
 *
 * More specific routes win over this catch-all, so /api/runs, /api/actions and
 * /api/email/report are still handled locally by their own handlers and are
 * never forwarded.
 */

export const runtime = "nodejs";
/** Never cached, never prerendered: this is a pass-through to a live service. */
export const dynamic = "force-dynamic";
/**
 * Render's free tier sleeps after ~15 minutes and takes roughly 50s to wake.
 * The default Vercel function limit is 10s, which would turn every cold start
 * into an opaque 504. 60s is the Hobby ceiling.
 */
export const maxDuration = 60;

/** Just under maxDuration, so we answer with our own honest message rather than
 *  letting the platform kill the function and return its generic error page. */
const UPSTREAM_TIMEOUT_MS = 55_000;

function backendBase(): string {
  const configured =
    process.env.BACKEND_API_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
    (process.env.NODE_ENV === "development" ? "http://127.0.0.1:8000" : "");

  return configured.replace(/\/+$/, "");
}

/**
 * Headers that must not be forwarded upstream.
 *
 * `host` is the important one: Render routes by Host, so passing the Vercel
 * hostname through makes it fail to match the service. `content-length` would
 * describe the original body rather than the one we re-encode. The rest are
 * hop-by-hop headers that are meaningless to a new connection. `cookie` is
 * dropped because the backend has no session model and there is no reason to
 * hand a third-party host the Supabase auth cookie.
 */
const STRIP_REQUEST = new Set([
  "host",
  "connection",
  "keep-alive",
  "transfer-encoding",
  "upgrade",
  "proxy-authorization",
  "proxy-authenticate",
  "te",
  "trailer",
  "content-length",
  "accept-encoding",
  "cookie",
]);

/**
 * `fetch` has already decompressed the upstream body, so forwarding its
 * `content-encoding` would tell the browser to decode it a second time and
 * yield garbage. `content-length` no longer matches for the same reason.
 */
const STRIP_RESPONSE = new Set([
  "content-encoding",
  "content-length",
  "transfer-encoding",
  "connection",
  "keep-alive",
]);

function filterHeaders(source: Headers, strip: Set<string>): Headers {
  const out = new Headers();
  source.forEach((value, key) => {
    if (!strip.has(key.toLowerCase())) out.set(key, value);
  });
  return out;
}

/** Shaped as {detail} because the API client reads that field first — the same
 *  shape FastAPI uses — so these surface as readable text in the UI. */
function problem(detail: string, status: number) {
  return NextResponse.json({ detail }, { status, headers: { "Cache-Control": "no-store" } });
}

async function proxy(request: NextRequest) {
  const base = backendBase();
  if (!base) {
    return problem(
      "The backend URL is not configured for this deployment. Set BACKEND_API_BASE_URL.",
      503,
    );
  }

  const target = new URL(`${request.nextUrl.pathname}${request.nextUrl.search}`, base);
  const hasBody = !["GET", "HEAD"].includes(request.method);

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: request.method,
      headers: filterHeaders(request.headers, STRIP_REQUEST),
      body: hasBody ? await request.text() : undefined,
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      redirect: "manual",
    });
  } catch (error) {
    // A sleeping or missing backend is a degraded state, not a crash. 503 with
    // a plain explanation beats a 500 stack trace the user cannot act on.
    const timedOut = error instanceof Error && error.name === "TimeoutError";
    return problem(
      timedOut
        ? "LifeCore did not respond in time. The backend is on a free tier that sleeps when idle — the first request after a pause can take up to a minute. Try again."
        : "Could not reach LifeCore. The backend may be starting up or temporarily unavailable.",
      timedOut ? 504 : 503,
    );
  }

  const headers = filterHeaders(upstream.headers, STRIP_RESPONSE);
  headers.set("Cache-Control", "no-store");

  return new NextResponse(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers,
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
