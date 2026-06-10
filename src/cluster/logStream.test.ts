import { describe, expect, it, vi } from "vitest";
import {
  appendCapped,
  podLogUrl,
  streamPodLogs,
  type LogStreamHandlers,
} from "./logStream";

/** A Response whose body streams the given chunks (strings or raw bytes), then closes. */
function streamingResponse(
  chunks: Array<string | Uint8Array>,
  init?: ResponseInit,
): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      for (const c of chunks) {
        controller.enqueue(typeof c === "string" ? encoder.encode(c) : c);
      }
      controller.close();
    },
  });
  return new Response(stream, init);
}

/** Collect handler events in call order, for asserting the lifecycle. */
function recordingHandlers() {
  const events: string[] = [];
  const chunks: string[] = [];
  const handlers: LogStreamHandlers = {
    onStart: () => events.push("start"),
    onOpen: () => events.push("open"),
    onChunk: (c) => {
      events.push("chunk");
      chunks.push(c);
    },
    onError: (m) => events.push(`error:${m}`),
    onDone: () => events.push("done"),
  };
  return { events, chunks, handlers };
}

describe("podLogUrl", () => {
  const pod = { namespace: "kube-system", name: "cilium-abc" };

  it("follows by default with 200 tail lines", () => {
    expect(podLogUrl(pod)).toBe(
      "/api/pods/kube-system/cilium-abc/logs?tailLines=200&follow=1",
    );
  });

  it("includes the container when given", () => {
    expect(podLogUrl(pod, "cilium-agent")).toContain("container=cilium-agent");
  });

  it("omits the follow flag when follow is false", () => {
    expect(podLogUrl(pod, undefined, { follow: false })).toBe(
      "/api/pods/kube-system/cilium-abc/logs?tailLines=200",
    );
  });

  it("honours a custom tailLines", () => {
    expect(podLogUrl(pod, undefined, { tailLines: 50 })).toContain("tailLines=50");
  });

  it("URL-encodes namespace, name and container", () => {
    const url = podLogUrl({ namespace: "a/b", name: "p d" }, "c&d");
    expect(url).toContain("/api/pods/a%2Fb/p%20d/logs");
    expect(url).toContain("container=c%26d");
  });
});

describe("appendCapped", () => {
  it("appends when under the cap", () => {
    expect(appendCapped("foo", "bar", 100)).toBe("foobar");
  });

  it("keeps only the last `max` chars when over the cap", () => {
    expect(appendCapped("12345", "6789", 4)).toBe("6789");
  });

  it("trims a long prefix down to the tail", () => {
    expect(appendCapped("abcdefgh", "ij", 5)).toBe("fghij");
  });
});

describe("streamPodLogs", () => {
  const url = "/api/pods/ns/pod/logs";

  it("drives the full lifecycle and yields every chunk in order", async () => {
    const { events, chunks, handlers } = recordingHandlers();
    const fetchImpl = vi.fn().mockResolvedValue(
      streamingResponse(["hello ", "world\n", "again\n"]),
    );

    await streamPodLogs(url, new AbortController().signal, handlers, fetchImpl);

    expect(fetchImpl).toHaveBeenCalledWith(url, expect.objectContaining({}));
    expect(chunks.join("")).toBe("hello world\nagain\n");
    expect(events).toEqual(["start", "open", "chunk", "chunk", "chunk", "done"]);
  });

  it("decodes a multi-byte char split across chunk boundaries", async () => {
    // UTF-8 for "é" is 0xC3 0xA9; deliver the two bytes in separate chunks.
    const { chunks, handlers } = recordingHandlers();
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        streamingResponse([new Uint8Array([0xc3]), new Uint8Array([0xa9])]),
      );

    await streamPodLogs(url, new AbortController().signal, handlers, fetchImpl);

    expect(chunks.join("")).toBe("é");
  });

  it("surfaces the response body as the error on a non-ok status", async () => {
    const { events, handlers } = recordingHandlers();
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(new Response("pod not found", { status: 404 }));

    await streamPodLogs(url, new AbortController().signal, handlers, fetchImpl);

    expect(events).toEqual(["start", "error:pod not found"]);
  });

  it("falls back to the status code when the error body is empty", async () => {
    const { events, handlers } = recordingHandlers();
    const fetchImpl = vi.fn().mockResolvedValue(new Response("", { status: 500 }));

    await streamPodLogs(url, new AbortController().signal, handlers, fetchImpl);

    expect(events).toEqual(["start", "error:HTTP 500"]);
  });

  it("swallows aborts without reporting an error", async () => {
    const { events, handlers } = recordingHandlers();
    const controller = new AbortController();
    controller.abort();
    const fetchImpl = vi
      .fn()
      .mockRejectedValue(new DOMException("aborted", "AbortError"));

    await streamPodLogs(url, controller.signal, handlers, fetchImpl);

    expect(events).toEqual(["start"]); // no open, no error, no done
  });

  it("reports unexpected (non-abort) failures via onError", async () => {
    const { events, handlers } = recordingHandlers();
    const fetchImpl = vi.fn().mockRejectedValue(new Error("network down"));

    await streamPodLogs(url, new AbortController().signal, handlers, fetchImpl);

    expect(events).toEqual(["start", "error:network down"]);
  });
});
