import ClusterMapIcon from "../assets/icons/cluster-map.svg?react";
import SettingsIcon from "../assets/icons/settings.svg?react";

import styles from "./OsDock.module.css";

/**
 * Left-edge OS dock: brand/home, the app rail, and the settings + user footer.
 * Collapsed to an icon rail; expands on hover to reveal labels.
 */
export default function OsDock() {
  return (
    <nav className={styles.dock}>
      <button className={styles["dock__home"]} title="Aranya — system menu">
        <img src="/aranya.svg" alt="Aranya" />
        <span className={styles["dock__wordmark"]}>ARANYA</span>
      </button>

      <div className={styles["dock__apps"]}>
        <button className={`${styles["dock__app"]} ${styles["dock__app--active"]}`} title="Cluster Map">
          <ClusterMapIcon />
          <span className={styles["dock__label"]}>Cluster Map</span>
        </button>
      </div>

      <div className={styles["dock__bottom"]}>
        <button className={styles["dock__app"]} title="Settings">
          <SettingsIcon />
          <span className={styles["dock__label"]}>Settings</span>
        </button>
        <div className={styles["dock__user-row"]}>
          <button className={styles["dock__user"]} title="vi@aranya.ops">
            VI
          </button>
          <span className={styles["dock__user-name"]}>
            vi <small>ops</small>
          </span>
        </div>
      </div>
    </nav>
  );
}
