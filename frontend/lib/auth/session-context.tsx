"use client";

import { createContext, useContext } from "react";

/**
 * The signed-in identity, read once by the `/app` layout on the server and
 * handed down. Client components never fetch it, so there is no signed-in
 * flicker and no extra round trip on every page.
 */

export interface AppSession {
  userId: string;
  email: string;
  /** RESEND_TO_EMAIL when set — the address the mailer can actually reach on a
   *  sandbox sender. Falls back to the signed-in address. */
  defaultEmailTo: string;
}

const SessionContext = createContext<AppSession | null>(null);

export function SessionProvider({
  session,
  children,
}: {
  session: AppSession;
  children: React.ReactNode;
}) {
  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>;
}

/** Null outside the `/app` subtree — the marketing pages have no session. */
export function useSession() {
  return useContext(SessionContext);
}
