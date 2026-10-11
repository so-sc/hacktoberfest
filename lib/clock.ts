import { useSyncExternalStore } from "react";

const subscribe = (cb: () => void) => {
  const id = setInterval(cb, 1000);
  return () => clearInterval(id);
};

/** Re-renders only when `select(now)` changes; returns `server` during SSR/hydration. */
export function useClock<T>(select: (now: number) => T, server: T): T {
  return useSyncExternalStore(subscribe, () => select(Date.now()), () => server);
}
