<h1 align="center">Neural Network Playground</h1>

<p align="center">
  An interactive neural network inference studio for handwritten digits.
</p>

<p align="center">
  <a href="https://jrmenendez.dev/projects/neural-network-playground/"><strong>View project</strong></a>
</p>

<p align="center">
  <img alt="React" src="https://img.shields.io/badge/React-19-61dafb?style=for-the-badge&logo=react&logoColor=111">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.7-3178c6?style=for-the-badge&logo=typescript&logoColor=fff">
  <img alt="FastAPI" src="https://img.shields.io/badge/FastAPI-0.115-009688?style=for-the-badge&logo=fastapi&logoColor=fff">
  <img alt="PyTorch" src="https://img.shields.io/badge/PyTorch-2.5-ee4c2c?style=for-the-badge&logo=pytorch&logoColor=fff">
  <img alt="Docker" src="https://img.shields.io/badge/Docker-ready-2496ed?style=for-the-badge&logo=docker&logoColor=fff">
</p>

Draw a digit, watch a trained model process it in real time, inspect neuron activations, and see confidence scores update through a polished visual interface.

## Highlights

- Real-time digit drawing and inference over WebSockets
- SVG neural network visualization with Canvas pulse animation
- Layer, neuron, activation, confidence, and preprocessing views
- PyTorch MLP checkpoint with model manifest metadata
- Dockerized FastAPI + React production build

## Stack

| Layer | Technology |
| --- | --- |
| Frontend | React, TypeScript, Vite, Zustand, Tailwind, Framer Motion |
| Visualization | SVG, Canvas 2D |
| Backend | FastAPI, Pydantic, WebSockets |
| ML | PyTorch, MLP `784 -> 32 -> 16 -> 10` |
| Deployment | Docker, Cloudflare Tunnel |

## Run Locally

```bash
npm install --prefix frontend
pip install -e backend
```

Start the frontend:

```bash
npm run dev:frontend
```

Start the backend:

```bash
npm run dev:backend
```

The frontend proxies `/ws` to the FastAPI backend during development.

## Docker

```bash
docker compose up --build
```

Open:

```text
http://localhost:8000
```

## Deployment

The app serves correctly from `/` by default. For a subpath deployment, set both base path variables before building the Docker image:

```bash
APP_BASE_PATH=/projects/neural-network-playground
VITE_BASE_PATH=/projects/neural-network-playground/
```

See `.env.example` for the local defaults and private deployment example.

## Verification

```bash
npm run build
npm run test:backend
```

With the backend running:

```bash
npm run smoke:ws
```

## Model Metadata

The backend exposes checkpoint metadata at:

```text
/api/model/manifest
```

The manifest includes architecture, training recipe, evaluation metrics, and checkpoint hash.
