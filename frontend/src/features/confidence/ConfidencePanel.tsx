import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useAppStore } from "../../stores/useAppStore";

const IDLE_PROBABILITIES = Array(10).fill(0);
const SMOOTHING_FACTOR = 0.18;
const SETTLE_THRESHOLD = 0.001;

export function ConfidencePanel() {
  const inference = useAppStore((state) => state.inference);
  const probabilities = useSmoothedProbabilities(inference?.probabilities ?? IDLE_PROBABILITIES);
  const prediction = inference?.prediction ?? null;
  const confidence = prediction === null ? 0 : probabilities[prediction];
  const ranked = useMemo(
    () =>
      probabilities
        .map((probability, digit) => ({ digit, probability }))
        .sort((a, b) => b.probability - a.probability || a.digit - b.digit),
    [probabilities]
  );

  return (
    <section className="rounded-panel border hairline bg-white/[0.025] p-5 xl:[@media(max-height:800px)]:p-4">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-6xl font-semibold leading-none xl:[@media(max-height:800px)]:text-5xl">{prediction ?? "-"}</p>
        </div>
        <p className="pb-2 text-2xl font-medium text-accent xl:[@media(max-height:800px)]:text-xl">{Math.round(confidence * 100)}%</p>
      </div>

      <div className="mt-5 space-y-2.5 xl:[@media(max-height:800px)]:mt-4 xl:[@media(max-height:800px)]:space-y-1.5">
        {ranked.map(({ digit, probability }) => (
          <motion.div
            key={digit}
            layout
            transition={{ type: "spring", stiffness: 210, damping: 28 }}
            className={digit === prediction ? "" : "hidden xl:block"}
          >
            <div className="mb-1 flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
              <span>{digit}</span>
              <span>{Math.round(probability * 100)}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
              <motion.div
                className={digit === prediction ? "h-full rounded-full bg-accent" : "h-full rounded-full bg-white/35"}
                initial={false}
                animate={{ width: `${probability * 100}%` }}
                transition={{ type: "spring", stiffness: 120, damping: 24 }}
              />
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function useSmoothedProbabilities(target: number[]) {
  const [displayed, setDisplayed] = useState(target);

  useEffect(() => {
    let frame = 0;

    const tick = () => {
      setDisplayed((current) => {
        let settled = true;
        const next = target.map((targetValue, index) => {
          const currentValue = current[index] ?? 0;
          const delta = targetValue - currentValue;
          if (Math.abs(delta) > SETTLE_THRESHOLD) {
            settled = false;
          }
          return Math.abs(delta) <= SETTLE_THRESHOLD ? targetValue : currentValue + delta * SMOOTHING_FACTOR;
        });

        if (!settled) {
          frame = requestAnimationFrame(tick);
        }

        return next;
      });
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  return displayed;
}
