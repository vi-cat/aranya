import Breadcrumbs, { type Crumb } from "./Breadcrumbs";
import styles from "./TopBar.module.css";
import { clusterMetrics } from "../cluster/metrics";
import type { ClusterState } from "../cluster/useCluster";

interface TopBarProps {
  cluster: ClusterState;
  crumbs: Crumb[];
}

/** Top bar: location breadcrumb on the left, live fleet KPIs on the right. */
export default function TopBar({ cluster, crumbs }: TopBarProps) {
  const m = clusterMetrics(cluster.data);
  const allReady = m.ready === m.nodes;
  const alertColor = m.alerts > 0 ? "rgb(224,149,60)" : "rgb(var(--h-nominal))";

  return (
    <div className={styles.topbar}>
      <Breadcrumbs items={crumbs} />

      <div className={styles["topbar__kpis"]}>
        <div className={styles["topbar__kpi"]}>
          <span className={styles["topbar__key"]}>Nodes</span>
          <span
            className={`${styles["topbar__value"]} ${allReady ? "" : styles["topbar__value--warn"]}`}
          >
            {m.ready}
            <small>/{m.nodes}</small>
          </span>
        </div>
        <div className={styles["topbar__kpi"]}>
          <span className={styles["topbar__key"]}>Avg&nbsp;CPU</span>
          <span className={styles["topbar__value"]}>
            {m.avgCpu}
            <small>%</small>
          </span>
        </div>
        <div className={styles["topbar__kpi"]}>
          <span className={styles["topbar__key"]}>Pods</span>
          <span className={styles["topbar__value"]}>{m.pods}</span>
        </div>
        <div className={styles["topbar__kpi"]}>
          <span className={styles["topbar__key"]}>Alerts</span>
          <span className={styles["topbar__alert"]}>
            <span
              className={`${styles["topbar__value"]} ${m.alerts > 0 ? styles["topbar__value--warn"] : ""}`}
            >
              {m.alerts}
            </span>
            <span
              className={styles["topbar__dot"]}
              style={{
                background: alertColor,
                boxShadow: `0 0 8px ${alertColor}`,
              }}
            />
          </span>
        </div>
      </div>
    </div>
  );
}
