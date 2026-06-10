import { useState } from "react";
import MapBackground from "./components/MapBackground";
import ClusterMap from "./components/ClusterMap";
import OsDock from "./components/OsDock";
import TopBar from "./components/TopBar";
import type { Crumb } from "./components/Breadcrumbs";
import { useCluster } from "./cluster/useCluster";

function App() {
  // cluster contains the top level data of the app
  const cluster = useCluster();
  // the node that we have last clicked. used as a toggle
  const [activeNode, setActiveNode] = useState<string | null>(null);

  const crumbs: Crumb[] = activeNode
    ? [
        { label: "Cluster", onClick: () => setActiveNode(null) },
        { label: activeNode },
      ]
    : [{ label: "Cluster" }];

  return (
    <>
      <MapBackground>
        <ClusterMap
          cluster={cluster}
          activeNode={activeNode}
          onActiveNodeChange={setActiveNode}
        />
      </MapBackground>
      <OsDock />
      <TopBar cluster={cluster} crumbs={crumbs} />
    </>
  );
}

export default App;
