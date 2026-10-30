import { useEffect, useState } from "react";

/** `value`, once it has stopped changing for `delayMs`. */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    // Setting an unchanged value can still commit, so an idle page would not be.
    if (Object.is(value, debounced)) {
      return;
    }
    const timer = setTimeout(() => {
      setDebounced(value);
    }, delayMs);
    return () => {
      clearTimeout(timer);
    };
  }, [value, debounced, delayMs]);

  return debounced;
}
