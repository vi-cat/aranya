import { useEffect, useRef, useState } from "react";
import type { ClusterPod } from "../cluster/types";
import { appendCapped, podLogUrl, streamPodLogs } from "../cluster/logStream";
import ContainerIcon from "../assets/icons/container.svg?react";
import styles from "./LogWindow.module.css";

interface LogWindowProps {
  pod: ClusterPod;
  onClose: () => void;
}

/**
 * Bottom console drawer that live-tails a pod's logs. Opens a follow stream
 * (/api/pods/:ns/:name/logs?follow=1) and appends chunks as they arrive. Mount with a
 * `key={pod.id}` so it resets cleanly when a different pod is opened.
 */
export default function LogWindow({ pod, onClose }: LogWindowProps) {
  const [container, setContainer] = useState(pod.containers[0] ?? "");
  const [log, setLog] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(true);
  const [streaming, setStreaming] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const bodyRef = useRef<HTMLDivElement>(null);
  // set while we scroll programmatically, so onScroll can ignore our own scroll events
  const selfScrolling = useRef(false);

  const { namespace, name } = pod;
  useEffect(() => {
    const controller = new AbortController();

    streamPodLogs(podLogUrl({ namespace, name }, container), controller.signal, {
      onStart: () => {
        setConnecting(true);
        setStreaming(false);
        setError(null);
        setLog("");
      },
      onOpen: () => {
        setConnecting(false);
        setStreaming(true);
      },
      onChunk: (chunk) => setLog((prev) => appendCapped(prev, chunk)),
      onError: (message) => {
        setError(message);
        setConnecting(false);
        setStreaming(false);
      },
      onDone: () => setStreaming(false),
    });

    return () => controller.abort();
  }, [namespace, name, container]);

  // keep the newest lines in view as they stream in (and when auto-scroll is re-enabled)
  useEffect(() => {
    if (!autoScroll) return;
    const el = bodyRef.current;
    if (!el) return;
    selfScrolling.current = true;
    el.scrollTop = el.scrollHeight;
  }, [log, autoScroll]);

  // only a genuine user scroll away from the bottom stops auto-scroll; ignore our own
  const onScroll = () => {
    if (selfScrolling.current) {
      selfScrolling.current = false;
      return;
    }
    const el = bodyRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
    if (!atBottom && autoScroll) setAutoScroll(false);
  };

  return (
    <section className={styles.log}>
      <header className={styles["log__header"]}>
        <div className={styles["log__title"]}>
          <span className={`${styles["log__status"]} ${streaming ? styles["log__status--live"] : ""}`} />
          <span className={styles["log__name"]}>{pod.name}</span>
          <span className={styles["log__namespace"]}>{pod.namespace}</span>
          {streaming && <span className={styles["log__live"]}>live</span>}
        </div>

        {pod.containers.length > 1 && (
          <div className={styles["log__container"]}>
            <ContainerIcon className={styles["log__container-icon"]} aria-hidden />
            <select
              className={styles["log__select"]}
              value={container}
              onChange={(e) => setContainer(e.target.value)}
              title="Container"
            >
              {pod.containers.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        )}

        <button className={styles["log__close"]} onClick={onClose} title="Close logs">
          ×
        </button>
      </header>

      <div className={styles["log__body"]} ref={bodyRef} onScroll={onScroll}>
        {error ? (
          <div className={styles["log__error"]}>{error}</div>
        ) : connecting ? (
          <div className={styles["log__placeholder"]}>connecting…</div>
        ) : (
          <pre className={styles["log__output"]}>{log || "(waiting for output…)"}</pre>
        )}
      </div>

      <button
        type="button"
        className={`${styles["log__autoscroll"]} ${autoScroll ? styles["log__autoscroll--active"] : ""}`}
        onClick={() => setAutoScroll((v) => !v)}
        aria-pressed={autoScroll}
        title={autoScroll ? "Auto-scroll on" : "Auto-scroll off"}
      >
        <span className={styles["log__checkbox"]} />
        Auto-scroll
      </button>
    </section>
  );
}
