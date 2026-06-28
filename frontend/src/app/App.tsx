import { useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, BrainCircuit, ChartNoAxesColumn, Pencil } from "lucide-react";
import { ConfidencePanel } from "../features/confidence/ConfidencePanel";
import { DrawingCanvas } from "../features/drawing/DrawingCanvas";
import { InspectorPanel } from "../features/inspector/InspectorPanel";
import { NetworkVisualizer } from "../features/network-visualizer/NetworkVisualizer";
import { PreprocessingPipeline } from "../features/preprocessing/PreprocessingPipeline";
import { PlaygroundSocket } from "../lib/socketClient";
import { useAppStore } from "../stores/useAppStore";

const PAGE_LOAD_ANIMATION_DELAY = 1;

export function App() {
  const {
    setConnectionState,
    setNetworkDescription,
    setInference,
    tensor
  } = useAppStore();

  const socket = useMemo(
    () =>
      new PlaygroundSocket({
        onConnectionState: setConnectionState,
        onNetworkDescription: setNetworkDescription,
        onInferenceResult: setInference
      }),
    [setConnectionState, setInference, setNetworkDescription]
  );

  useEffect(() => {
    socket.connect();
    return () => socket.disconnect();
  }, [socket]);

  return (
    <main className="h-screen overflow-hidden px-5 py-4 text-[var(--color-text-primary)] max-xl:h-auto max-xl:overflow-auto xl:[@media(max-height:800px)]:py-3">
      <div className="mx-auto flex h-full w-full max-w-[2400px] flex-col gap-4 xl:[@media(max-height:800px)]:gap-3">
        <header className="flex h-14 items-center gap-3 border-b hairline xl:[@media(max-height:800px)]:h-11">
          <a
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] bg-white/[0.025] text-[var(--color-text-secondary)] transition hover:border-[var(--color-border-strong)] hover:bg-white/[0.055] hover:text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-line)]"
            href="/"
            aria-label="Back to homepage"
          >
            <ArrowLeft aria-hidden="true" size={17} strokeWidth={1.9} />
          </a>
          <h1 className="text-xl font-medium tracking-normal">Neural Network Playground</h1>
        </header>

        <section className="grid min-h-0 flex-1 grid-cols-[320px_minmax(0,1fr)_340px] gap-4 max-xl:grid-cols-1 xl:[@media(max-height:800px)]:gap-3">
          <motion.aside
            className="panel order-1 flex min-h-0 flex-col gap-5 rounded-panel p-5 max-xl:min-h-0 xl:[@media(max-height:800px)]:gap-3 xl:[@media(max-height:800px)]:p-4"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: PAGE_LOAD_ANIMATION_DELAY }}
          >
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-full border border-[var(--color-border)] bg-white/[0.04] text-blue-200">
                <Pencil aria-hidden="true" size={17} strokeWidth={1.8} />
              </span>
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.28em] text-white/40">Input</p>
                <h2 className="text-xl font-semibold tracking-[-0.03em] text-white">Draw a digit</h2>
              </div>
            </div>
            <DrawingCanvas
              onPreview={(nextTensor) => socket.requestInference(nextTensor, "preview")}
              onFinal={(nextTensor) => socket.requestInference(nextTensor, "final")}
            />
            <div className="hidden xl:block xl:[@media(max-height:800px)]:hidden">
              <PreprocessingPipeline />
            </div>
          </motion.aside>

          <motion.section
            className="panel relative order-2 min-h-0 overflow-hidden rounded-panel p-5 max-xl:order-3 xl:[@media(max-height:800px)]:p-4"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: PAGE_LOAD_ANIMATION_DELAY + 0.05 }}
          >
            <div className="mb-3 flex items-center justify-between xl:[@media(max-height:800px)]:mb-2">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-full border border-[var(--color-border)] bg-white/[0.04] text-blue-200">
                  <BrainCircuit aria-hidden="true" size={17} strokeWidth={1.8} />
                </span>
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.28em] text-white/40">Network</p>
                  <h2 className="text-xl font-semibold tracking-[-0.03em] text-white">Activation flow</h2>
                </div>
              </div>
            </div>
            <NetworkVisualizer tensor={tensor} />
          </motion.section>

          <motion.aside
            className="panel order-3 flex min-h-0 flex-col gap-4 rounded-panel p-5 max-xl:order-2 max-xl:min-h-0 xl:[@media(max-height:800px)]:gap-3 xl:[@media(max-height:800px)]:p-4"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: PAGE_LOAD_ANIMATION_DELAY + 0.1 }}
          >
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-full border border-[var(--color-border)] bg-white/[0.04] text-blue-200">
                <ChartNoAxesColumn aria-hidden="true" size={17} strokeWidth={1.8} />
              </span>
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.28em] text-white/40">Output</p>
                <h2 className="text-xl font-semibold tracking-[-0.03em] text-white">Prediction</h2>
              </div>
            </div>
            <ConfidencePanel />
            <div className="xl:[@media(max-height:800px)]:hidden">
              <InspectorPanel />
            </div>
          </motion.aside>
        </section>
      </div>
    </main>
  );
}
