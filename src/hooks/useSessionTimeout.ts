'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Session timeout configuration
 * - TIMEOUT_MS: Total idle time before auto-logout (30 minutes)
 * - WARNING_MS: Show warning dialog this many ms before logout (2 minutes)
 * - CHECK_INTERVAL: How often to check idle time (every 10 seconds)
 */
const TIMEOUT_MS = 30 * 60 * 1000;       // 30 minutes
const WARNING_MS = 2 * 60 * 1000;         // 2 minutes warning
const CHECK_INTERVAL = 10 * 1000;         // Check every 10 seconds
const COUNTDOWN_INTERVAL = 1 * 1000;      // Countdown every 1 second
const STORAGE_KEY = 'rl_last_activity';   // localStorage key for persisting activity

const ACTIVITY_EVENTS = [
  'mousedown',
  'mousemove',
  'keydown',
  'scroll',
  'touchstart',
  'click',
];

interface SessionTimeoutState {
  showWarning: boolean;
  countdownSeconds: number;
  stayLoggedIn: () => void;
}

/**
 * Hook to track user inactivity and auto-logout after a timeout.
 * Persists last activity in localStorage so it works across page refreshes.
 *
 * @param onLogout - Callback to execute when session expires (e.g., call logout())
 * @param enabled - Whether the timeout should be active (only when authenticated)
 */
export function useSessionTimeout(
  onLogout: () => void,
  enabled: boolean = false
): SessionTimeoutState {
  const [showWarning, setShowWarning] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState(0);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const logoutTriggeredRef = useRef(false);
  const onLogoutRef = useRef(onLogout);

  // Keep the callback ref up to date
  useEffect(() => {
    onLogoutRef.current = onLogout;
  }, [onLogout]);

  // Record activity to localStorage
  const recordActivity = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, Date.now().toString());
    } catch {
      // localStorage not available (private browsing, etc.)
    }
  }, []);

  // Get last activity timestamp
  const getLastActivity = useCallback((): number => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return parseInt(stored, 10);
      }
    } catch {
      // localStorage not available
    }
    return Date.now();
  }, []);

  // Clear countdown timer
  const clearCountdown = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  // Perform logout (called only once)
  const performLogout = useCallback(() => {
    if (logoutTriggeredRef.current) return;
    logoutTriggeredRef.current = true;

    clearCountdown();
    setShowWarning(false);
    setCountdownSeconds(0);

    // Clear the stored activity so re-login starts fresh
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }

    // Call the server-side logout endpoint
    fetch('/api/auth/login', { method: 'DELETE' }).catch(() => {});

    // Trigger the client-side logout (clears Zustand state + cookie)
    onLogoutRef.current();
  }, [clearCountdown]);

  // Stay logged in — reset timer and dismiss warning
  const stayLoggedIn = useCallback(() => {
    recordActivity();
    clearCountdown();
    setShowWarning(false);
    setCountdownSeconds(0);
    logoutTriggeredRef.current = false;
  }, [recordActivity, clearCountdown]);

  // Main check loop
  useEffect(() => {
    if (!enabled) {
      clearCountdown();
      setShowWarning(false);
      return;
    }

    // Initialize activity on mount
    recordActivity();

    // Attach activity listeners
    const handleActivity = () => {
      recordActivity();
      // If warning is showing and user becomes active, reset the warning
      if (showWarning) {
        stayLoggedIn();
      }
    };

    ACTIVITY_EVENTS.forEach((event) => {
      // Use passive: true for performance (scroll/touch events)
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Periodic check for idle timeout
    const checkInterval = setInterval(() => {
      const lastActivity = getLastActivity();
      const idleTime = Date.now() - lastActivity;

      if (idleTime >= TIMEOUT_MS) {
        // Session expired — logout
        performLogout();
      } else if (idleTime >= TIMEOUT_MS - WARNING_MS) {
        // Within warning window — show warning with countdown
        const secondsLeft = Math.ceil((TIMEOUT_MS - idleTime) / 1000);
        setShowWarning(true);
        setCountdownSeconds(secondsLeft);
      }
    }, CHECK_INTERVAL);

    // Countdown timer (only runs when warning is visible)
    countdownRef.current = setInterval(() => {
      const lastActivity = getLastActivity();
      const idleTime = Date.now() - lastActivity;
      const secondsLeft = Math.ceil((TIMEOUT_MS - idleTime) / 1000);

      if (secondsLeft <= 0) {
        performLogout();
      } else {
        setCountdownSeconds(secondsLeft);
      }
    }, COUNTDOWN_INTERVAL);

    return () => {
      clearInterval(checkInterval);
      clearCountdown();
      ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [enabled, recordActivity, getLastActivity, performLogout, stayLoggedIn, clearCountdown, showWarning]);

  return { showWarning, countdownSeconds, stayLoggedIn };
}
