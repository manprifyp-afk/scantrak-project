import { useCallback, useEffect, useRef, useState } from "react";
import { getApiErrorMessage } from "../lib/api";

// Runs an async function on mount and exposes loading/error/data + a reload().
// Uses a ref for `fn` so passing an inline function never causes a refetch loop.
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fnRef.current());
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reload, ...deps]);

  return { data, loading, error, reload };
}
