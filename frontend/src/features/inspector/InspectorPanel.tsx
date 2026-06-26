import { useMemo } from "react";
import { useAppStore } from "../../stores/useAppStore";

export function InspectorPanel() {
  const selected = useAppStore((state) => state.selectedNeuron);
  const inference = useAppStore((state) => state.inference);

  const activation = useMemo(() => {
    if (!selected || !inference) return null;
    return inference.activations[selected.layer]?.[selected.index] ?? null;
  }, [inference, selected]);

  if (!selected) {
    return (
      <section className="min-h-0 flex-1 rounded-panel border hairline bg-white/[0.025] p-5">
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-text-muted)]">Inspector</p>
        <p className="mt-4 text-sm leading-6 text-[var(--color-text-secondary)]">
          Select a neuron to inspect its layer, index, activation, and nearby weight context.
        </p>
      </section>
    );
  }

  return (
    <section className="min-h-0 flex-1 overflow-hidden rounded-panel border hairline bg-white/[0.025] p-5">
      <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-text-muted)]">Inspector</p>
      <div className="mt-4 space-y-3">
        <Field label="Layer" value={selected.layer} />
        <Field label="Neuron" value={`#${selected.index}`} />
        <Field label="Activation" value={activation === null ? "idle" : activation.toFixed(4)} />
        <Field label="Strength" value={activation === null ? "idle" : `${Math.round(activation * 100)}%`} />
      </div>
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b hairline pb-2">
      <span className="text-xs text-[var(--color-text-muted)]">{label}</span>
      <span className="truncate text-sm text-[var(--color-text-secondary)]">{value}</span>
    </div>
  );
}
