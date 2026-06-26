import { useCallback, useEffect, useRef } from "react";
import type { PointerEvent } from "react";
import { Eraser } from "lucide-react";
import { preprocessCanvas } from "../../lib/preprocess";
import { useAppStore } from "../../stores/useAppStore";

type Point = {
  x: number;
  y: number;
};

type DrawingCanvasProps = {
  onPreview: (tensor: number[]) => void;
  onFinal: (tensor: number[]) => void;
};

export function DrawingCanvas({ onPreview, onFinal }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<Point | null>(null);
  const pointsRef = useRef<Point[]>([]);
  const previewTimerRef = useRef<number | null>(null);
  const setPreprocessResult = useAppStore((state) => state.setPreprocessResult);
  const resetInput = useAppStore((state) => state.resetInput);

  const paintWhite = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const scale = window.devicePixelRatio || 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const scale = window.devicePixelRatio || 1;
      canvas.width = Math.floor(rect.width * scale);
      canvas.height = Math.floor(rect.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      paintWhite();
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [paintWhite]);

  const emitPreprocess = useCallback(
    (mode: "preview" | "final") => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const result = preprocessCanvas(canvas);
      setPreprocessResult(result);
      if (mode === "preview") onPreview(result.tensor);
      if (mode === "final") onFinal(result.tensor);
    },
    [onFinal, onPreview, setPreprocessResult]
  );

  const schedulePreview = useCallback(() => {
    if (previewTimerRef.current) return;
    previewTimerRef.current = window.setTimeout(() => {
      previewTimerRef.current = null;
      emitPreprocess("preview");
    }, 200);
  }, [emitPreprocess]);

  const cancelPreview = useCallback(() => {
    if (!previewTimerRef.current) return;
    window.clearTimeout(previewTimerRef.current);
    previewTimerRef.current = null;
  }, []);

  const getPoint = (event: PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = event.currentTarget;
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  };

  const drawTo = (point: Point) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    pointsRef.current.push(point);

    ctx.strokeStyle = "#050505";
    ctx.lineWidth = 16;
    ctx.shadowColor = "rgba(0, 0, 0, 0.12)";
    ctx.shadowBlur = 1;
    drawSmoothTail(ctx, pointsRef.current);
    ctx.shadowBlur = 0;
    lastPointRef.current = point;
  };

  const clear = () => {
    if (previewTimerRef.current) {
      window.clearTimeout(previewTimerRef.current);
      previewTimerRef.current = null;
    }
    isDrawingRef.current = false;
    lastPointRef.current = null;
    pointsRef.current = [];
    paintWhite();
    resetInput();
  };

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-[16px] border hairline bg-white p-2">
        <canvas
          ref={canvasRef}
          className="h-[260px] w-full cursor-crosshair rounded-[12px] bg-white sm:h-[300px] xl:h-[344px] xl:[@media(max-height:800px)]:h-[300px]"
          aria-label="Digit drawing canvas"
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            isDrawingRef.current = true;
            const point = getPoint(event);
            lastPointRef.current = point;
            pointsRef.current = [point];
          }}
          onPointerMove={(event) => {
            if (!isDrawingRef.current) return;
            const coalescedEvents = "getCoalescedEvents" in event.nativeEvent ? event.nativeEvent.getCoalescedEvents() : [event.nativeEvent];
            coalescedEvents.forEach((coalescedEvent) => {
              const rect = event.currentTarget.getBoundingClientRect();
              drawTo({
                x: coalescedEvent.clientX - rect.left,
                y: coalescedEvent.clientY - rect.top
              });
            });
            schedulePreview();
          }}
          onPointerUp={(event) => {
            if (!isDrawingRef.current) return;
            cancelPreview();
            drawTo(getPoint(event));
            isDrawingRef.current = false;
            lastPointRef.current = null;
            pointsRef.current = [];
            emitPreprocess("final");
          }}
          onPointerCancel={() => {
            cancelPreview();
            isDrawingRef.current = false;
            lastPointRef.current = null;
            pointsRef.current = [];
          }}
        />
      </div>
      <button
        className="flex h-10 w-full items-center justify-center gap-2 rounded-control border hairline text-sm text-[var(--color-text-secondary)] transition hover:text-white"
        onClick={clear}
      >
        <Eraser className="size-4" />
        Clear
      </button>
    </div>
  );
}

function drawSmoothTail(ctx: CanvasRenderingContext2D, points: Point[]) {
  if (points.length < 2) return;

  if (points.length === 2) {
    const [from, to] = points;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    return;
  }

  const p0 = points[Math.max(0, points.length - 4)];
  const p1 = points[points.length - 3];
  const p2 = points[points.length - 2];
  const p3 = points[points.length - 1];
  const cp1 = {
    x: p1.x + (p2.x - p0.x) / 6,
    y: p1.y + (p2.y - p0.y) / 6
  };
  const cp2 = {
    x: p2.x - (p3.x - p1.x) / 6,
    y: p2.y - (p3.y - p1.y) / 6
  };

  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, p2.x, p2.y);
  ctx.stroke();

  if (points.length > 6) {
    points.splice(0, points.length - 6);
  }
}
