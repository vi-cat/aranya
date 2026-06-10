/**
 * Pod log streaming helpers, factored out of LogWindow so the imperative
 * fetch-and-read logic can be unit-tested independently of React.
 */
import type { ClusterPod } from "./types";

/** Keep the rendered buffer bounded so a chatty pod can't grow it without limit. */
export const MAX_LOG_CHARS = 100_000;

export interface LogStreamOptions {
  /** How many trailing lines to seed the stream with. */
  tailLines?: number;
  /** Follow (live-tail) vs. one-shot fetch. */
  follow?: boolean;
}

/** Build the BFF log endpoint URL for a pod/container. */
export function podLogUrl(
  pod: Pick<ClusterPod, "namespace" | "name">,
  container?: string,
  { tailLines = 200, follow = true }: LogStreamOptions = {},
): string {
  const params = new URLSearchParams({ tailLines: String(tailLines) });
  if (follow) params.set("follow", "1");
  if (container) params.set("container", container);
  return `/api/pods/${encodeURIComponent(pod.namespace)}/${encodeURIComponent(
    pod.name,
  )}/logs?${params}`;
}

/** Append a chunk to a log buffer, keeping only the last `max` characters. */
export function appendCapped(prev: string, chunk: string, max = MAX_LOG_CHARS): string {
  return (prev + chunk).slice(-max);
}

export interface LogStreamHandlers {
  /** Fired before the request, so callers can reset their state. */
  onStart?: () => void;
  /** Fired once the response is open and bytes are about to flow. */
  onOpen?: () => void;
  /** Fired for each decoded text chunk. */
  onChunk: (chunk: string) => void;
  /** Fired if the stream fails for any reason other than an abort. */
  onError: (message: string) => void;
  /** Fired when the server closes the stream cleanly. */
  onDone?: () => void;
}

/**
 * Open a follow stream and pump decoded text chunks to the handlers until the
 * server closes it, the signal aborts, or it errors. Aborts are swallowed (they
 * are the expected cleanup path); everything else surfaces via `onError`.
 *
 * `fetchImpl` is injectable purely so tests can drive it without a real network.
 */
export async function streamPodLogs(
  url: string,
  signal: AbortSignal,
  handlers: LogStreamHandlers,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  handlers.onStart?.();
  try {
    const res = await fetchImpl(url, { signal });
    if (!res.ok || !res.body) {
      const text = await res.text().catch(() => "");
      throw new Error(text || `HTTP ${res.status}`);
    }
    handlers.onOpen?.();

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      // stream: true lets a multi-byte char split across chunk boundaries decode correctly
      handlers.onChunk(decoder.decode(value, { stream: true }));
    }
    handlers.onDone?.();
  } catch (e) {
    if (signal.aborted) return; // expected on cleanup
    handlers.onError(e instanceof Error ? e.message : String(e));
  }
}
