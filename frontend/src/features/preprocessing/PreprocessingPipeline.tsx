import { useAppStore } from "../../stores/useAppStore";

export function PreprocessingPipeline() {
  const cropDataUrl = useAppStore((state) => state.cropDataUrl);
  const grayscaleDataUrl = useAppStore((state) => state.grayscaleDataUrl);
  const tensor = useAppStore((state) => state.tensor);

  return (
    <section className="space-y-3">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-text-muted)]">Preprocess</p>
        <h3 className="text-sm font-medium text-[var(--color-text-secondary)]">What the model receives</h3>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Preview label="crop" src={cropDataUrl} />
        <Preview label="28x28" src={grayscaleDataUrl} />
        <TensorPreview tensor={tensor} />
      </div>
    </section>
  );
}

function Preview({ label, src }: { label: string; src: string | null }) {
  return (
    <div className="rounded-control border hairline bg-white/[0.025] p-2">
      <div className="grid aspect-square place-items-center overflow-hidden rounded-[9px] bg-white">
        {src ? <img className="h-full w-full object-contain" alt={`${label} preview`} src={src} /> : null}
      </div>
      <p className="mt-2 text-center text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">{label}</p>
    </div>
  );
}

function TensorPreview({ tensor }: { tensor: number[] }) {
  return (
    <div className="rounded-control border hairline bg-white/[0.025] p-2">
      <div
        className="grid aspect-square gap-px overflow-hidden rounded-[9px] bg-black/30 p-1"
        style={{ gridTemplateColumns: "repeat(28, minmax(0, 1fr))" }}
      >
        {tensor.map((value, index) => (
          <span
            key={index}
            className="rounded-[1px]"
            style={{ backgroundColor: `rgba(245, 245, 247, ${0.04 + value * 0.9})` }}
          />
        ))}
      </div>
      <p className="mt-2 text-center text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">tensor</p>
    </div>
  );
}
