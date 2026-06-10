import { describe, expect, it } from "vitest";
import { nodeToTile, podToTile } from "./tiles";
import type { ClusterNode, ClusterPod } from "./types";

function makePod(overrides: Partial<ClusterPod> = {}): ClusterPod {
  return {
    id: "uid-1",
    name: "coredns-abc",
    namespace: "kube-system",
    node: "pool-x-3ullx6",
    phase: "Running",
    owner: "ReplicaSet",
    containers: ["coredns"],
    cpuPct: 3,
    memMiB: 170,
    ...overrides,
  };
}

function makeNode(overrides: Partial<ClusterNode> = {}): ClusterNode {
  return {
    id: "pool-x-3ullx6",
    name: "pool-x-3ullx6",
    ready: true,
    instanceType: "s-4vcpu-8gb",
    region: "sfo2",
    cpuPct: 16,
    memPct: 11,
    memGiB: 0.67,
    podCount: 1,
    pods: [makePod()],
    ...overrides,
  };
}

describe("nodeToTile", () => {
  it("maps the core fields onto a tile", () => {
    const tile = nodeToTile(makeNode());
    expect(tile).toMatchObject({
      id: "pool-x-3ullx6",
      label: "3ullx6", // short name = last dash-segment
      util: 16,
      mem: 0.67,
    });
  });

  it("keeps the full name as id but shortens the label", () => {
    const tile = nodeToTile(makeNode({ name: "pool-zy5r0ppmc-3ullxa" }));
    expect(tile.id).toBe("pool-zy5r0ppmc-3ullxa");
    expect(tile.label).toBe("3ullxa");
  });

  it("falls back to the whole name when there is no dash", () => {
    expect(nodeToTile(makeNode({ name: "node42" })).label).toBe("node42");
  });

  it("is off when the node is not ready", () => {
    expect(nodeToTile(makeNode({ ready: true })).off).toBe(false);
    expect(nodeToTile(makeNode({ ready: false })).off).toBe(true);
  });

  it("is critical when any pod is unhealthy", () => {
    expect(nodeToTile(makeNode({ pods: [makePod({ phase: "Running" })] })).crit).toBe(false);
    expect(nodeToTile(makeNode({ pods: [makePod({ phase: "Succeeded" })] })).crit).toBe(false);
    expect(
      nodeToTile(
        makeNode({ pods: [makePod({ phase: "Running" }), makePod({ phase: "Failed" })] }),
      ).crit,
    ).toBe(true);
  });

  it("is not critical with no pods", () => {
    expect(nodeToTile(makeNode({ pods: [] })).crit).toBe(false);
  });
});

describe("podToTile", () => {
  it("maps the core fields onto a tile", () => {
    const tile = podToTile(makePod({ name: "coredns-abc", cpuPct: 3 }));
    expect(tile).toMatchObject({
      id: "coredns-abc",
      util: 3,
    });
  });

  it("converts memory MiB → GiB rounded to two decimals", () => {
    expect(podToTile(makePod({ memMiB: 332 })).mem).toBe(0.32); // 332/1024 = 0.3242…
    expect(podToTile(makePod({ memMiB: 1024 })).mem).toBe(1);
    expect(podToTile(makePod({ memMiB: 0 })).mem).toBe(0);
  });

  it("is off unless Running or Succeeded", () => {
    expect(podToTile(makePod({ phase: "Running" })).off).toBe(false);
    expect(podToTile(makePod({ phase: "Succeeded" })).off).toBe(false);
    expect(podToTile(makePod({ phase: "Pending" })).off).toBe(true);
    expect(podToTile(makePod({ phase: "Failed" })).off).toBe(true);
  });

  it("is critical only for Failed or Unknown", () => {
    expect(podToTile(makePod({ phase: "Failed" })).crit).toBe(true);
    expect(podToTile(makePod({ phase: "Unknown" })).crit).toBe(true);
    expect(podToTile(makePod({ phase: "Pending" })).crit).toBe(false); // off, but not critical
    expect(podToTile(makePod({ phase: "Running" })).crit).toBe(false);
  });
});
