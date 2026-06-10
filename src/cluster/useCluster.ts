import { useEffect, useState } from "react";
import type { ClusterData } from "./types";

const POLL_MS = 5000;

export interface ClusterState {
  data: ClusterData | null;
  error: string | null;
}

/** Polls /api/cluster on an interval. The backend holds the kubeconfig; this only sees JSON. */
export function useCluster(): ClusterState {
  const [data, setData] = useState<ClusterData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const res = await fetch("/api/cluster");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as ClusterData;
        if (active) {
          setData(json);
          setError(null);
        }
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : String(e));
      }
    };

    void load();
    const timer = setInterval(() => void load(), POLL_MS);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  return { data, error };
}
