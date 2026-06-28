# Architecture

## Locked Decisions

- Vite + React + TypeScript
- Zustand state
- Tailwind + CSS variables/design tokens
- Three-column studio layout
- Polished drawing canvas with smoothing
- Full preprocessing pipeline visible for V1
- Focus View and Technical View for the network visualization
- SVG network structure plus Canvas pulse overlay
- Framer Motion for UI transitions
- FastAPI + PyTorch over one typed WebSocket endpoint
- MLP `784 -> 32 -> 16 -> 10`
- Backend loads `models/checkpoints/digit_mlp.pt` when present
- Hybrid inference: preview while drawing, final on stroke end
- Confidence display: compact by default, expandable detail
- Simple neuron inspector for V1
- No training replay for now
- No database for V1
- Single container deployment target

## Visual Principle

The app should be truthful and educational without being literal everywhere. Dense technical detail can be summarized visually when it would harm clarity.
