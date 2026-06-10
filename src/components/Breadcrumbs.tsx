import { Fragment } from "react";
import styles from "./Breadcrumbs.module.css";

export interface Crumb {
  label: string;
  /** If set, the crumb is a button that navigates when clicked. The last crumb is never clickable. */
  onClick?: () => void;
}

interface BreadcrumbsProps {
  items: Crumb[];
}

export default function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <div className={styles.breadcrumb}>
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <Fragment key={i}>
            {isLast ? (
              <em className={styles["breadcrumb__current"]}>{item.label}</em>
            ) : item.onClick ? (
              <button
                type="button"
                className={styles["breadcrumb__link"]}
                onClick={item.onClick}
              >
                {item.label}
              </button>
            ) : (
              <span className={styles["breadcrumb__item"]}>{item.label}</span>
            )}
            {!isLast && <span className={styles["breadcrumb__separator"]}>/</span>}
          </Fragment>
        );
      })}
    </div>
  );
}
