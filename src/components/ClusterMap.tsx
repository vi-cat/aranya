import { useMemo, useState } from "react";
import HexGrid from "./HexGrid";
import LogWindow from "./LogWindow";
import { nodeToTile, podToTile } from "../cluster/tiles";
import type { ClusterState } from "../cluster/useCluster";
import type { ClusterNode, ClusterPod } from "../cluster/types";
import styles from "./ClusterMap.module.css";

// Stable empty reference so memos don't invalidate while the cluster is still loading.
const NO_NODES: ClusterNode[] = [];

interface ClusterMapProps {
  cluster: ClusterState;
  /** Node we're drilled into, or null for the cluster overview. */
  activeNode: string | null;
  onActiveNodeChange: (node: string | null) => void;
}

/**
 * Two zoom levels over live cluster data:
 *   cluster (activeNode null) → node hexes; clicking a node zooms into its pods
 *   node                      → pod hexes;  clicking a pod opens its log window
 * The active node is controlled by the parent (so the breadcrumb can drive it too).
 */
export default function ClusterMap({
  cluster,
  activeNode,
  onActiveNodeChange,
}: ClusterMapProps) {
  const { data, error } = cluster;
  const [openPod, setOpenPod] = useState<ClusterPod | null>(null);

  const nodes = data?.nodes ?? NO_NODES;
  const pods = useMemo(
    () => (activeNode ? (nodes.find((n) => n.name === activeNode)?.pods ?? []) : []),
    [activeNode, nodes],
  );

  // cluster overview → node tiles; drilled into a node → its pod tiles
  const tiles = useMemo(
    () => (activeNode ? pods.map(podToTile) : nodes.map(nodeToTile)),
    [activeNode, nodes, pods],
  );

  const onSelect = (id: string) => {
    if (activeNode === null) {
      onActiveNodeChange(id); // drill into the node
      setOpenPod(null);
    } else {
      const pod = pods.find((p) => p.name === id); // open the pod's logs
      if (pod) setOpenPod(pod);
    }
  };

  const selectedId = activeNode ? (openPod?.name ?? null) : null;
  // only show logs for a pod that belongs to the node we're currently viewing
  const logPod = openPod?.node === activeNode ? openPod : null;

  return (
    <>
      <HexGrid nodes={tiles} selectedId={selectedId} onSelect={onSelect} />

      {activeNode !== null && (
        <button
          className={styles["cluster-map__back"]}
          onClick={() => {
            onActiveNodeChange(null);
            setOpenPod(null);
          }}
        >
          ← Cluster
        </button>
      )}

      {error && (
        <div className={styles["cluster-map__error"]}>
          cluster unavailable — {error}
        </div>
      )}

      {logPod && (
        <LogWindow
          key={logPod.id}
          pod={logPod}
          onClose={() => setOpenPod(null)}
        />
      )}
    </>
  );
}
