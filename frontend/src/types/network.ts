export type LayerKey = "input" | "hidden1" | "hidden2" | "output";

export type NetworkDescription = {
  layers: Array<{
    key: LayerKey;
    label: string;
    size: number;
  }>;
};

export type InferenceResult = {
  prediction: number;
  confidence: number;
  probabilities: number[];
  logits: number[];
  activations: {
    hidden1: number[];
    hidden2: number[];
    output: number[];
  };
  inferenceMs: number;
  mode: "preview" | "final";
};

export type SelectedNeuron = {
  layer: Exclude<LayerKey, "input">;
  index: number;
};
