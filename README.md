# ARANYA — Kubernetes cluster map

A live operator dashboard for a Kubernetes cluster. Nodes are rendered as a
honeycomb of heat-coloured hex tiles; click a node to zoom into its pods, and
click a pod to live-tail its logs.

Built with **React 19 + TypeScript + Vite**. Cluster data is read through a
small backend-for-frontend that runs inside the Vite dev server, so the
kubeconfig (and its cluster-admin token) never reaches the browser.

## Prerequisites

- **Node.js 20.19+ or 22.12+** (required by Vite 8) and npm
- A **kubeconfig** with read access to the target cluster

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Provide the kubeconfig**

   By default the server reads `./virginia-hiring-aranya-kubeconfig.yaml` from
   the project root. Drop your kubeconfig there:

   ```bash
   cp /path/to/your-kubeconfig.yaml ./virginia-hiring-aranya-kubeconfig.yaml
   ```

   Or point it elsewhere with an environment variable:

   ```bash
   export KUBECONFIG_PATH=/absolute/path/to/kubeconfig.yaml
   ```

   > **Security:** this file contains a cluster-admin credential. It is
   > git-ignored (`*kubeconfig*.yaml`) and is only ever read server-side — the
   > browser receives sanitized JSON, never the token. Don't commit it.

## Running locally

```bash
npm run dev
```

Then open the URL Vite prints (default <http://localhost:5173>). The dev server
also serves the read-only cluster API on the same origin:

- `GET /api/cluster` — full cluster snapshot (nodes with their pods), polled
  every 5s by the UI
- `GET /api/pods/:namespace/:name/logs?follow=1` — live log stream for a pod

## Scripts

| Command              | What it does                                        |
| -------------------- | --------------------------------------------------- |
| `npm run dev`        | Start the app + cluster API with hot reload         |
| `npm run build`      | Type-check and build the static frontend to `dist/` |
| `npm run preview`    | Serve the production build locally                  |
| `npm test`           | Run the unit tests once (Vitest)                    |
| `npm run test:watch` | Run the tests in watch mode                         |
| `npm run lint`       | Lint with ESLint                                    |

## How it works

```
Browser (React)  ──fetch /api/*──►  Vite dev server  ──@kubernetes/client-node──►  K8s API
   no token       ◄──sanitized JSON──   (server/k8sApi.ts)   ◄──raw V1Node/V1Pod──   server
```

- **`server/k8sApi.ts`** — a Vite plugin that loads the kubeconfig, calls the
  Kubernetes API, and translates the raw objects into the small shapes the UI
  needs. The only place the credential is used.
- **`src/cluster/`** — data layer: `useCluster` (polls `/api/cluster`),
  `logStream` (pod log streaming), `tiles` (cluster entities → hex tiles), and
  `metrics` (top-bar KPIs).
- **`src/hex/` + `src/components/`** — the hex geometry/layout and the UI
  (cluster map, hex grid, top bar, dock, log window).

> **Note:** the cluster API currently lives in the **Vite dev server**, so
> `/api/*` exists only under `npm run dev`. The production build (`dist/`) is
> static frontend assets and has no backend. Standing up a separate API server
> is the next step toward a deployable app.

## License

All rights reserved. This repository is public solely for evaluation as part of
a hiring process; it is not open source. See [`LICENSE`](./LICENSE).
