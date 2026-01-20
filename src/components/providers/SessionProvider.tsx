"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";

export function SessionProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextAuthSessionProvider
      basePath="/api/auth"
      // Check session every 5 minutes (300 seconds)
      refetchInterval={5 * 60}
      // Check session when user returns to the tab
      refetchOnWindowFocus={true}
    >
      {children}
    </NextAuthSessionProvider>
  );
}
