"use client";

import { SessionProvider as NextAuthSessionProvider, useSession } from "next-auth/react";
import { useEffect, useRef, useCallback } from "react";

// Activity tracker component that refreshes session on user interaction
function ActivityTracker({ children }: { children: React.ReactNode }) {
  const { update, status } = useSession();
  const lastActivityRef = useRef<number>(Date.now());
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Debounced session refresh - refreshes session after 30 seconds of activity
  // This prevents excessive API calls while still extending the session on activity
  const scheduleRefresh = useCallback(() => {
    if (status !== "authenticated") return;
    
    lastActivityRef.current = Date.now();
    
    // Clear any existing scheduled refresh
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    
    // Schedule a session refresh after 30 seconds of activity
    // This batches activity into periodic refreshes rather than refreshing on every event
    refreshTimeoutRef.current = setTimeout(() => {
      if (status === "authenticated") {
        // Trigger session refresh to extend expiration
        update();
      }
    }, 30 * 1000); // 30 seconds debounce
  }, [update, status]);
  
  useEffect(() => {
    if (status !== "authenticated") return;
    
    // Activity events that indicate user is actively using the app
    const activityEvents = [
      'mousedown',
      'mousemove', 
      'keydown',
      'scroll',
      'touchstart',
      'click',
      'focus'
    ];
    
    // Throttled event handler - only process events every 5 seconds
    let lastEventTime = 0;
    const handleActivity = () => {
      const now = Date.now();
      if (now - lastEventTime > 5000) { // 5 second throttle
        lastEventTime = now;
        scheduleRefresh();
      }
    };
    
    // Add listeners
    activityEvents.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });
    
    // Cleanup
    return () => {
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [status, scheduleRefresh]);
  
  return <>{children}</>;
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextAuthSessionProvider
      basePath="/api/auth"
      // Check session every 5 minutes - the activity tracker handles more frequent updates
      refetchInterval={5 * 60}
      // Check session when user returns to the tab (extends session on tab focus)
      refetchOnWindowFocus={true}
    >
      <ActivityTracker>
        {children}
      </ActivityTracker>
    </NextAuthSessionProvider>
  );
}
