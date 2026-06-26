import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { getPulseConnections, InferenceStage, useCanvasPulses } from "./useCanvasPulses";
import { useAppStore } from "../../stores/useAppStore";
import type { LayerKey } from "../../types/network";

type Node = {
  id: string;
  layer: Exclude<LayerKey, "input">;
  index: number;
  x: number;
  y: number;
  activation: number;
};

type Connection = {
  id: string;
  from: Node;
  to: Node;
  weight: number;
};

type NetworkVisualizerProps = {
  tensor: number[];
};

export function NetworkVisualizer({ tensor }: NetworkVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const inference = useAppStore((state) => state.inference);
  const selectedNeuron = useAppStore((state) => state.selectedNeuron);
  const setSelectedNeuron = useAppStore((state) => state.setSelectedNeuron);
  const topOutputIndex = inference?.prediction ?? null;
  const [stage, setStage] = useState<InferenceStage>(null);
  const [compactLayout, setCompactLayout] = useState(false);
  const viewBoxHeight = compactLayout ? 1540 : 640;
  const activePixels = tensor.filter((value) => value > 0.12).length;

  const nodes = useMemo(() => buildNodes(inference?.activations, compactLayout), [compactLayout, inference?.activations]);
  const backgroundConnections = useMemo(() => buildBackgroundConnections(nodes), [nodes]);
  const signalConnections = useMemo(() => buildSignalConnections(nodes), [nodes]);
  const backgroundConnectionIds = useMemo(
    () => new Set(backgroundConnections.map((connection) => connection.id)),
    [backgroundConnections]
  );
  const ghostConnections = useMemo(() => {
    const visiblePulseConnections = getPulseConnections(signalConnections, topOutputIndex, inference?.mode, stage);
    const uniqueConnections = new Map(visiblePulseConnections.map((connection) => [connection.id, connection]));

    return Array.from(uniqueConnections.values()).filter((connection) => !backgroundConnectionIds.has(connection.id));
  }, [backgroundConnectionIds, inference?.mode, signalConnections, stage, topOutputIndex]);
  const focus = useMemo(
    () => buildFocusState(nodes, signalConnections, selectedNeuron),
    [nodes, selectedNeuron, signalConnections]
  );
  useCanvasPulses(canvasRef, signalConnections, inference?.mode, topOutputIndex, stage, viewBoxHeight);

  const toggleNeuron = (node: Node) => {
    const alreadySelected = selectedNeuron?.layer === node.layer && selectedNeuron.index === node.index;
    setSelectedNeuron(alreadySelected ? null : { layer: node.layer, index: node.index });
  };

  useEffect(() => {
    const query = window.matchMedia("(max-width: 1279px)");
    const syncLayout = () => setCompactLayout(query.matches);
    syncLayout();
    query.addEventListener("change", syncLayout);
    return () => query.removeEventListener("change", syncLayout);
  }, []);

  useEffect(() => {
    if (inference?.mode !== "final" || activePixels === 0) {
      setStage(null);
      return;
    }

    const timeline: Array<[number, InferenceStage]> = [
      [0, "input"],
      [260, "hidden1"],
      [560, "hidden2"],
      [880, "output"],
      [1320, null]
    ];
    const timers = timeline.map(([delay, nextStage]) => window.setTimeout(() => setStage(nextStage), delay));
    return () => timers.forEach(window.clearTimeout);
  }, [activePixels, inference?.mode, inference?.prediction, inference?.inferenceMs]);

  return (
    <div className="signal-field relative h-[560px] min-h-0 overflow-hidden rounded-[16px] border hairline bg-black/10 sm:h-[620px] xl:h-[calc(100%-3.5rem)]">
      <div className="absolute left-5 top-5 z-10 rounded-full border hairline bg-black/20 px-3 py-1 text-xs text-[var(--color-text-muted)]">
        Focus view · {activePixels} active pixels
      </div>
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <svg ref={svgRef} className="absolute inset-0 h-full w-full" viewBox={`0 0 1000 ${viewBoxHeight}`} role="img">
        <defs>
          <radialGradient id="network-depth" cx="54%" cy="46%" r="58%">
            <stop offset="0%" stopColor="rgba(110,168,255,0.12)" />
            <stop offset="48%" stopColor="rgba(110,168,255,0.035)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </radialGradient>
          <filter id="soft-glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect x="0" y="0" width="1000" height={viewBoxHeight} fill="url(#network-depth)" opacity="0.72" />

        <InputField tensor={tensor} active={stage === "input"} compact={compactLayout} />

        <g>
          {backgroundConnections.map((connection) => {
            const focused = focus.focusedConnectionIds.has(connection.id);
            const muted = focus.active && !focused;
            const staged = connectionMatchesStage(connection, stage);
            return (
              <line
                key={connection.id}
                x1={connection.from.x}
                y1={connection.from.y}
                x2={connection.to.x}
                y2={connection.to.y}
                stroke={staged ? "rgba(178,210,255,0.24)" : connectionStroke(connection, muted)}
                strokeWidth={staged ? 1.1 : connection.weight}
                className="transition-all duration-300"
              />
            );
          })}
        </g>

        <g>
          {ghostConnections.map((connection) => {
            const focused = focus.focusedConnectionIds.has(connection.id);
            const muted = focus.active && !focused;
            return (
              <motion.line
                key={`ghost-${connection.id}`}
                x1={connection.from.x}
                y1={connection.from.y}
                x2={connection.to.x}
                y2={connection.to.y}
                stroke={muted ? "rgba(178,210,255,0.055)" : "rgba(178,210,255,0.16)"}
                strokeLinecap="round"
                strokeWidth={0.62 + connectionStrength(connection) * 0.9}
                filter="url(#soft-glow)"
                initial={{ opacity: 0 }}
                animate={{ opacity: muted ? 0.12 : [0.08, 0.38, 0.18] }}
                transition={{ duration: 0.58, ease: "easeOut" }}
              />
            );
          })}
        </g>

        <g>
          {signalConnections
            .filter((connection) => focus.focusedConnectionIds.has(connection.id))
            .map((connection) => (
              <line
                key={`focus-${connection.id}`}
                x1={connection.from.x}
                y1={connection.from.y}
                x2={connection.to.x}
                y2={connection.to.y}
                stroke="rgba(178,210,255,0.48)"
                strokeLinecap="round"
                strokeWidth={1.15 + connectionStrength(connection) * 1.2}
                filter="url(#soft-glow)"
                className="transition-all duration-300"
              />
            ))}
        </g>

        {nodes.map((node) => {
          const selected = focus.selectedNodeIds.has(node.id);
          const connected = focus.connectedNodeIds.has(node.id);
          const muted = focus.active && !selected && !connected;
          const topOutput = node.layer === "output" && topOutputIndex === node.index;
          const staged = nodeMatchesStage(node, stage);
          return (
            <g
              key={node.id}
              className="cursor-pointer transition-opacity duration-300"
              role="button"
              tabIndex={0}
              style={{ outline: "none" }}
              onClick={() => toggleNeuron(node)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  toggleNeuron(node);
                }
              }}
              opacity={muted ? 0.28 : staged ? 1 : stage ? 0.52 : 1}
            >
              {staged ? (
                <motion.circle
                  cx={node.x}
                  cy={node.y}
                  r={12}
                  fill="rgba(110,168,255,0.08)"
                  stroke="rgba(178,210,255,0.34)"
                  strokeWidth={1}
                  initial={false}
                  animate={{ r: [10, 14, 10], opacity: [0.28, 0.7, 0.28] }}
                  transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
                />
              ) : null}
              {selected ? (
                <motion.circle
                  cx={node.x}
                  cy={node.y}
                  r={15}
                  fill="none"
                  stroke="rgba(110,168,255,0.42)"
                  strokeWidth={1.2}
                  initial={false}
                  animate={{ r: [13, 18, 13], opacity: [0.62, 0.16, 0.62] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                />
              ) : null}
              <circle
                cx={node.x}
                cy={node.y}
                r={selected ? 9 : 7}
                fill={nodeFill(node, topOutput, selected, connected, staged)}
                stroke={selected ? "rgba(178,210,255,0.95)" : topOutput ? "rgba(245,245,247,0.62)" : connected ? "rgba(178,210,255,0.42)" : "rgba(255,255,255,0.16)"}
                strokeWidth={selected ? 2 : 1}
                filter={topOutput || selected || connected || staged ? "url(#soft-glow)" : undefined}
                className="cursor-pointer transition"
              />
            </g>
          );
        })}

        <OutputDigitLabels nodes={nodes.filter((node) => node.layer === "output")} topOutputIndex={topOutputIndex} />

        <LayerLabels compact={compactLayout} />
      </svg>
    </div>
  );
}

function InputField({ tensor, active, compact }: { tensor: number[]; active: boolean; compact: boolean }) {
  const size = compact ? 12.6 : 7;
  const gap = compact ? 1.85 : 1.8;
  const gridSize = 28 * size + 27 * gap;
  const startX = compact ? 500 - gridSize / 2 : 62;
  const startY = compact ? 150 : 210;

  return (
    <motion.g
      initial={false}
      animate={{ opacity: active ? 1 : 0.88 }}
      transition={{ duration: 0.22 }}
      filter={active ? "url(#soft-glow)" : undefined}
    >
      {active ? (
        <motion.rect
          x={startX - 16}
          y={startY - 16}
          width={compact ? gridSize + 32 : 28 * (size + gap) + 23}
          height={compact ? gridSize + 32 : 28 * (size + gap) + 23}
          rx={12}
          fill="none"
          stroke="rgba(178,210,255,0.24)"
          strokeWidth={1}
          initial={false}
          animate={{ opacity: [0.18, 0.52, 0.18] }}
          transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
        />
      ) : null}
      {tensor.map((value, index) => {
        const x = index % 28;
        const y = Math.floor(index / 28);
        return (
          <rect
            key={index}
            x={startX + x * (size + gap)}
            y={startY + y * (size + gap)}
            width={size}
            height={size}
            rx={1}
            fill={`rgba(245,245,247,${0.035 + value * 0.86})`}
          />
        );
      })}
    </motion.g>
  );
}

function OutputDigitLabels({ nodes, topOutputIndex }: { nodes: Node[]; topOutputIndex: number | null }) {
  return (
    <g fontSize="19.5" fontWeight="500" letterSpacing="0">
      {nodes.map((node) => (
        <text
          key={`label-${node.id}`}
          x={node.x + 22}
          y={node.y + 6}
          fill={topOutputIndex === node.index ? "rgba(245,245,247,0.94)" : "rgba(161,161,170,0.58)"}
        >
          {node.index}
        </text>
      ))}
    </g>
  );
}

function buildFocusState(nodes: Node[], connections: Connection[], selectedNeuron: { layer: Node["layer"]; index: number } | null) {
  if (!selectedNeuron) {
    return {
      active: false,
      selectedNodeIds: new Set<string>(),
      connectedNodeIds: new Set<string>(),
      focusedConnectionIds: new Set<string>()
    };
  }

  const selectedNodeIds = new Set(
    nodes
      .filter((node) => node.layer === selectedNeuron.layer && node.index === selectedNeuron.index)
      .map((node) => node.id)
  );
  const connectedNodeIds = new Set<string>();
  const focusedConnectionIds = new Set<string>();

  connections.forEach((connection) => {
    const touchesSelected = selectedNodeIds.has(connection.from.id) || selectedNodeIds.has(connection.to.id);
    if (!touchesSelected) return;
    focusedConnectionIds.add(connection.id);
    connectedNodeIds.add(connection.from.id);
    connectedNodeIds.add(connection.to.id);
  });

  selectedNodeIds.forEach((id) => connectedNodeIds.delete(id));

  return {
    active: selectedNodeIds.size > 0,
    selectedNodeIds,
    connectedNodeIds,
    focusedConnectionIds
  };
}

function connectionStroke(connection: Connection, muted: boolean) {
  if (muted) {
    return "rgba(245,245,247,0.022)";
  }

  return "rgba(255,255,255,0.08)";
}

function connectionStrength(connection: Connection) {
  return Math.min(1, (connection.from.activation ?? 0) * 0.58 + (connection.to.activation ?? 0) * 0.42);
}

function nodeFill(node: Node, topOutput: boolean, selected: boolean, connected: boolean, staged: boolean) {
  if (selected) {
    return "rgba(245,245,247,0.96)";
  }
  if (topOutput) {
    return "rgba(245,245,247,0.92)";
  }
  if (staged) {
    return `rgba(230,240,255,${0.34 + node.activation * 0.5})`;
  }
  if (connected) {
    return `rgba(210,226,247,${0.26 + node.activation * 0.42})`;
  }
  return `rgba(245,245,247,${0.1 + node.activation * 0.28})`;
}

function nodeMatchesStage(node: Node, stage: InferenceStage) {
  return stage === node.layer;
}

function connectionMatchesStage(connection: Connection, stage: InferenceStage) {
  if (stage === "hidden2") {
    return connection.from.layer === "hidden1" && connection.to.layer === "hidden2";
  }
  if (stage === "output") {
    return connection.to.layer === "output";
  }
  return false;
}

function LayerLabels({ compact }: { compact: boolean }) {
  return (
    <g fill="rgba(161,161,170,0.75)" fontSize="18" letterSpacing="0">
      {compact ? (
        <>
          <text x="500" y="128" textAnchor="middle">input tensor</text>
          <text x="62" y="740" textAnchor="middle">hidden 1</text>
          <text x="500" y="740" textAnchor="middle">hidden 2</text>
          <text x="902" y="740" textAnchor="middle">output</text>
        </>
      ) : (
        <>
          <text x="184.3" y="178" textAnchor="middle">input tensor</text>
          <text x="410" y="120" textAnchor="middle">hidden 1</text>
          <text x="620" y="120" textAnchor="middle">hidden 2</text>
          <text x="830" y="120" textAnchor="middle">output</text>
        </>
      )}
    </g>
  );
}

function buildNodes(activations?: { hidden1: number[]; hidden2: number[]; output: number[] }, compact = false): Node[] {
  const h1Count = 18;
  const h2Count = 12;
  const nodes: Node[] = [];
  nodes.push(...layerNodes("hidden1", h1Count, compact ? 62 : 410, activations?.hidden1 ?? [], compact));
  nodes.push(...layerNodes("hidden2", h2Count, compact ? 500 : 620, activations?.hidden2 ?? [], compact));
  nodes.push(...layerNodes("output", 10, compact ? 902 : 830, activations?.output ?? [], compact));
  return nodes;
}

function layerNodes(layer: Exclude<LayerKey, "input">, count: number, x: number, activationValues: number[], compact: boolean) {
  const top = compact ? 800 : 160;
  const height = compact ? 672 : 360;
  return Array.from({ length: count }, (_, index) => {
    const sourceIndex =
      activationValues.length === 0
        ? index
        : count === activationValues.length
          ? index
          : Math.floor((index / count) * activationValues.length);
    return {
      id: `${layer}-${index}`,
      layer,
      index: sourceIndex,
      x,
      y: top + (index / Math.max(count - 1, 1)) * height,
      activation: activationValues[sourceIndex] ?? 0
    };
  });
}

function buildBackgroundConnections(nodes: Node[]): Connection[] {
  const h1 = nodes.filter((node) => node.layer === "hidden1");
  const h2 = nodes.filter((node) => node.layer === "hidden2");
  const out = nodes.filter((node) => node.layer === "output");
  const connect = (from: Node[], to: Node[]) => {
    const pairs = new Set<string>();

    from.forEach((_, sourceIndex) => {
      to.forEach((__, targetIndex) => {
        if ((sourceIndex + targetIndex) % 4 !== 0) return;

        pairs.add(`${sourceIndex}:${targetIndex}`);
        pairs.add(`${from.length - 1 - sourceIndex}:${to.length - 1 - targetIndex}`);
      });
    });

    return Array.from(pairs)
      .sort((a, b) => {
        const [sourceA, targetA] = a.split(":").map(Number);
        const [sourceB, targetB] = b.split(":").map(Number);
        return sourceA - sourceB || targetA - targetB;
      })
      .map((pair) => {
        const [sourceIndex, targetIndex] = pair.split(":").map(Number);
        const source = from[sourceIndex];
        const target = to[targetIndex];
        return {
          id: `${source.id}-${target.id}`,
          from: source,
          to: target,
          weight: 0.7
        };
      });
  };

  return [...connect(h1, h2), ...connect(h2, out)];
}

function buildSignalConnections(nodes: Node[]): Connection[] {
  const h1 = nodes.filter((node) => node.layer === "hidden1");
  const h2 = nodes.filter((node) => node.layer === "hidden2");
  const out = nodes.filter((node) => node.layer === "output");

  const connect = (from: Node[], to: Node[]) =>
    from.flatMap((source) =>
      to.map((target) => ({
        id: `${source.id}-${target.id}`,
        from: source,
        to: target,
        weight: 0.7
      }))
    );

  return [...connect(h1, h2), ...connect(h2, out)];
}
