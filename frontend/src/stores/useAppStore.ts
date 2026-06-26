import { create } from "zustand";
import type { InferenceResult, NetworkDescription, SelectedNeuron } from "../types/network";

type ConnectionState = "idle" | "connecting" | "connected" | "disconnected" | "error";

type AppState = {
  connectionState: ConnectionState;
  networkDescription: NetworkDescription | null;
  inference: InferenceResult | null;
  selectedNeuron: SelectedNeuron | null;
  tensor: number[];
  cropDataUrl: string | null;
  grayscaleDataUrl: string | null;
  setConnectionState: (state: ConnectionState) => void;
  setNetworkDescription: (description: NetworkDescription) => void;
  setInference: (result: InferenceResult) => void;
  setSelectedNeuron: (selected: SelectedNeuron | null) => void;
  setPreprocessResult: (result: { tensor: number[]; cropDataUrl: string; grayscaleDataUrl: string }) => void;
  resetInput: () => void;
};

export const useAppStore = create<AppState>((set) => ({
  connectionState: "idle",
  networkDescription: null,
  inference: null,
  selectedNeuron: null,
  tensor: Array(784).fill(0),
  cropDataUrl: null,
  grayscaleDataUrl: null,
  setConnectionState: (connectionState) => set({ connectionState }),
  setNetworkDescription: (networkDescription) => set({ networkDescription }),
  setInference: (inference) => set({ inference }),
  setSelectedNeuron: (selectedNeuron) => set({ selectedNeuron }),
  setPreprocessResult: ({ tensor, cropDataUrl, grayscaleDataUrl }) => set({ tensor, cropDataUrl, grayscaleDataUrl }),
  resetInput: () =>
    set({
      inference: null,
      selectedNeuron: null,
      tensor: Array(784).fill(0),
      cropDataUrl: null,
      grayscaleDataUrl: null
    })
}));
