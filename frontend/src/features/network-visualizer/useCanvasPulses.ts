import { RefObject, useEffect } from "react";

export type PulseConnection = {
  id: string;
  from: { x: number; y: number; layer?: string; index?: number; activation?: number };
  to: { x: number; y: number; layer?: string; index?: number; activation?: number };
};

export type InferenceStage = "input" | "hidden1" | "hidden2" | "output" | null;

export function useCanvasPulses(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  connections: PulseConnection[],
  mode: "preview" | "final" | undefined,
  topOutputIndex: number | null,
  stage: InferenceStage = null,
  viewBoxHeight = 640
) {
  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    if (!canvas || !host) return;

    let startTime = performance.now();
    let animationId = 0;
    let cssWidth = 0;
    let cssHeight = 0;

    const resize = () => {
      const rect = host.getBoundingClientRect();
      const scale = window.devicePixelRatio || 1;
      cssWidth = rect.width;
      cssHeight = rect.height;
      canvas.width = Math.floor(rect.width * scale);
      canvas.height = Math.floor(rect.height * scale);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    };

    const draw = (now: number) => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const pixelRatio = window.devicePixelRatio || 1;
      const viewBoxWidth = 1000;
      const viewScale = Math.min(cssWidth / viewBoxWidth, cssHeight / viewBoxHeight);
      const offsetX = (cssWidth - viewBoxWidth * viewScale) / 2;
      const offsetY = (cssHeight - viewBoxHeight * viewScale) / 2;
      const elapsed = now - startTime;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.scale(pixelRatio, pixelRatio);
      if (mode) {
        const alpha = mode === "preview" ? 0.18 : 0.34;
        const speed = mode === "preview" ? 2100 : 1650;
        const visible = getPulseConnections(connections, topOutputIndex, mode, stage);

        visible.forEach((connection, index) => {
          const from = project(connection.from.x, connection.from.y, viewScale, offsetX, offsetY);
          const to = project(connection.to.x, connection.to.y, viewScale, offsetX, offsetY);
          const phase = ((elapsed + index * 84) % speed) / speed;
          const head = interpolate(from, to, phase);
          const tail = interpolate(from, to, Math.max(0, phase - 0.09));
          const gradient = ctx.createLinearGradient(tail.x, tail.y, head.x, head.y);
          gradient.addColorStop(0, "rgba(110, 168, 255, 0)");
          gradient.addColorStop(0.55, `rgba(110, 168, 255, ${alpha * 0.55})`);
          gradient.addColorStop(1, `rgba(178, 210, 255, ${alpha})`);

          ctx.lineCap = "round";
          ctx.strokeStyle = gradient;
          ctx.lineWidth = mode === "preview" ? 1.2 : 1.6;
          ctx.shadowColor = "rgba(110, 168, 255, 0.38)";
          ctx.shadowBlur = mode === "preview" ? 5 : 9;
          ctx.beginPath();
          ctx.moveTo(tail.x, tail.y);
          ctx.lineTo(head.x, head.y);
          ctx.stroke();

          ctx.shadowBlur = 0;
          ctx.fillStyle = `rgba(178, 210, 255, ${alpha * 0.8})`;
          ctx.beginPath();
          ctx.arc(head.x, head.y, mode === "preview" ? 1.8 : 2.3, 0, Math.PI * 2);
          ctx.fill();
        });
      }
      ctx.restore();
      animationId = requestAnimationFrame(draw);
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    startTime = performance.now();
    animationId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animationId);
      observer.disconnect();
    };
  }, [canvasRef, connections, mode, topOutputIndex, stage, viewBoxHeight]);
}

export function getPulseConnections<TConnection extends PulseConnection>(
  connections: TConnection[],
  topOutputIndex: number | null,
  mode: "preview" | "final" | undefined,
  stage: InferenceStage
) {
  if (topOutputIndex === null || !mode) {
    return [];
  }

  const activeHiddenConnections = connections
    .filter((connection) => connection.from.layer !== "output" && connection.to.layer !== "output")
    .sort((a, b) => connectionStrength(b) - connectionStrength(a));
  const activeOutputConnections = selectOutputPulseConnections(connections, topOutputIndex, mode);

  if (stage === "input" || stage === "hidden1") {
    return activeHiddenConnections.slice(0, mode === "final" ? 10 : 8);
  }

  if (stage === "hidden2") {
    return activeHiddenConnections.slice(0, mode === "final" ? 20 : 14);
  }

  if (stage === "output") {
    return activeOutputConnections;
  }

  if (mode === "final") {
    return [...activeHiddenConnections.slice(0, 25), ...activeOutputConnections];
  }

  return [...activeHiddenConnections.slice(0, 20), ...activeOutputConnections];
}

function selectOutputPulseConnections<TConnection extends PulseConnection>(
  connections: TConnection[],
  topOutputIndex: number,
  mode: "preview" | "final"
) {
  const outputConnections = connections.filter((connection) => connection.to.layer === "output");
  const topActivation =
    outputConnections.find((connection) => connection.to.index === topOutputIndex)?.to.activation ?? 0;

  if (topActivation <= 0) {
    return [];
  }

  const minimumVisibleActivation = Math.max(0.035, topActivation * 0.18);
  const maxOutputs = mode === "final" ? 5 : 4;
  const maxPulsesPerOutput = mode === "final" ? 8 : 6;
  const outputIndexes = Array.from(new Set(outputConnections.map((connection) => connection.to.index)))
    .map((index) => ({
      index,
      activation: outputConnections.find((connection) => connection.to.index === index)?.to.activation ?? 0
    }))
    .filter((output) => output.index === topOutputIndex || output.activation >= minimumVisibleActivation)
    .sort((a, b) => b.activation - a.activation)
    .slice(0, maxOutputs);

  return outputIndexes.flatMap((output) => {
    const rankedConnections = outputConnections
      .filter((connection) => connection.to.index === output.index)
      .sort((a, b) => (b.from.activation ?? 0) - (a.from.activation ?? 0));
    const confidenceRatio = output.activation / topActivation;
    const pulseCount =
      output.index === topOutputIndex
        ? maxPulsesPerOutput
        : Math.max(2, Math.round(maxPulsesPerOutput * confidenceRatio * 0.62));

    return Array.from({ length: pulseCount }, (_, index) => rankedConnections[index % rankedConnections.length]).filter(
      Boolean
    );
  });
}

function connectionStrength(connection: PulseConnection) {
  return (connection.from.activation ?? 0) * 0.7 + (connection.to.activation ?? 0) * 0.3;
}

function project(x: number, y: number, scale: number, offsetX: number, offsetY: number) {
  return {
    x: offsetX + x * scale,
    y: offsetY + y * scale
  };
}

function interpolate(from: { x: number; y: number }, to: { x: number; y: number }, phase: number) {
  return {
    x: from.x + (to.x - from.x) * phase,
    y: from.y + (to.y - from.y) * phase
  };
}
