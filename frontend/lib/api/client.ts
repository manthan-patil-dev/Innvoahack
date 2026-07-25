/**
 * The only module in the frontend that knows the backend speaks HTTP.
 *
 * Everything above this file deals in ChatResponse / HealthResponse. If the
 * transport ever changes (streaming, a proxy route, a different host), this
 * file changes and nothing else does.
 */

import type { ChatRequestPayload, ChatResponse, HealthResponse } from "@/lib/types/agents";

/** Trailing slash stripped so `${BASE}/api/chat` can never produce a double slash. */
export const API_BASE = (
  process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || "http://127.0.0.1:8000"
).replace(/\/+$/, "");

/** Live runs legitimately take a while; mock mode returns in a couple of seconds. */
const REQUEST_TIMEOUT_MS = 120_000;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** FastAPI reports handled failures as {detail: "..."}; fall back to the raw body. */
async function readError(res: Response): Promise<string> {
  try {
    const body = await res.text();
    if (!body) return `${res.status} ${res.statusText}`;
    try {
      const parsed = JSON.parse(body) as { detail?: unknown };
      if (typeof parsed.detail === "string" && parsed.detail.trim()) return parsed.detail;
    } catch {
      /* not JSON — use the raw text below */
    }
    return body.slice(0, 300);
  } catch {
    return `${res.status} ${res.statusText}`;
  }
}

async function request<T>(path: string, init: RequestInit, external?: AbortSignal): Promise<T> {
  // One controller drives both the timeout and the caller's abort, so a
  // component unmounting mid-flight actually cancels the request.
  const controller = new AbortController();
  const onExternalAbort = () => controller.abort();

  if (external) {
    if (external.aborted) controller.abort();
    else external.addEventListener("abort", onExternalAbort, { once: true });
  }

  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...init, signal: controller.signal });
  } catch (err) {
    // A caller-driven abort is not an error worth surfacing — re-throw it as-is
    // so the hook can distinguish it from a genuine transport failure.
    if (external?.aborted) throw err;
    if (controller.signal.aborted) {
      throw new ApiError(`LifeCore did not respond within ${REQUEST_TIMEOUT_MS / 1000}s.`);
    }
    throw new ApiError(
      `Could not reach LifeCore at ${API_BASE}. Is the backend running?`,
      undefined,
      err,
    );
  } finally {
    clearTimeout(timer);
    external?.removeEventListener("abort", onExternalAbort);
  }

  if (!res.ok) throw new ApiError(await readError(res), res.status);

  try {
    return (await res.json()) as T;
  } catch (err) {
    throw new ApiError("LifeCore returned a malformed response.", res.status, err);
  }
}

/** Run one request through the full LifeCore pipeline. */
export function postChat(payload: ChatRequestPayload, signal?: AbortSignal): Promise<ChatResponse> {
  return request<ChatResponse>(
    "/api/chat",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    signal,
  );
}

/** Which backend is live, and whether it is running on fixtures. */
export function getHealth(signal?: AbortSignal): Promise<HealthResponse> {
  return request<HealthResponse>("/api/health", { method: "GET" }, signal);
}
