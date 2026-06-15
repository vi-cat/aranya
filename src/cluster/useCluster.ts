import { useEffect, useState } from "react";
import type { ClusterData } from "./types";

const POLL_MS = 5000;

export interface ClusterState {
  data: ClusterData | null;
  error: string | null;
  namespaces: string[];
}

/** Polls /api/cluster and fetches /api/namespaces once on mount. The backend holds the
 *  kubeconfig; this only sees JSON. */
export function useCluster(): ClusterState {
  const [data, setData] = useState<ClusterData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [namespaces, setNamespaces] = useState<string[]>([]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const [clusterRes, nsRes] = await Promise.all([
          fetch("/api/cluster"),
          fetch("/api/namespaces"),
        ]);
        if (!clusterRes.ok) throw new Error(`HTTP ${clusterRes.status}`);
        const json = (await clusterRes.json()) as ClusterData;
        if (active) {
          setData(json);
          setError(null);
        }
        if (active && nsRes.ok) {
          const ns = (await nsRes.json()) as string[];
          setNamespaces(ns);
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

  return { data, error, namespaces };
}
