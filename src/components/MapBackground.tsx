import type { ReactNode } from "react";
import styles from "./MapBackground.module.css";

/**
 * Background texture layers for the cluster map: grid, scanlines, the hex layer (passed
 * as children, so it sits under the vignette), and a vignette on top. Themeable via
 * body[data-bg].
 */
export default function MapBackground({ children }: { children?: ReactNode }) {
  return (
    <>
      <div className={`${styles["map__layer"]} ${styles["map__layer--grid"]}`} />
      <div className={`${styles["map__layer"]} ${styles["map__layer--scan"]}`} />
      <div className={styles["map__hexes"]}>{children}</div>
      <div className={`${styles["map__layer"]} ${styles["map__layer--vignette"]}`} />
    </>
  );
}
