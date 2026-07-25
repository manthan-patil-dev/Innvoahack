/**
 * `next dev` and `next build` both own `.next`, so producing a production build
 * while a dev server is running leaves each one serving the other's chunks —
 * which surfaces as "Failed to read a RSC payload created by a development
 * version of React", or as 404s on route handlers the dev server has not
 * compiled yet.
 *
 * The `build:prod` / `start:prod` scripts use `.next-prod` instead, so the
 * pre-submission check can run beside a live dev server. npm exposes the script
 * name as `npm_lifecycle_event`, which is the one signal available here that
 * behaves identically on Windows, macOS and Linux without adding cross-env.
 *
 * @type {import('next').NextConfig}
 */
const isolated = (process.env.npm_lifecycle_event ?? "").endsWith(":prod");

const nextConfig = {
  distDir: process.env.NEXT_DIST_DIR || (isolated ? ".next-prod" : ".next"),
};

export default nextConfig;
