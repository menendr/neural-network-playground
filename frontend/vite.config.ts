import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const requestedBasePath = process.env.VITE_BASE_PATH || "/";
const basePath = requestedBasePath.endsWith("/") ? requestedBasePath : `${requestedBasePath}/`;

export default defineConfig({
  base: basePath,
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/ws": {
        target: "ws://localhost:8000",
        ws: true
      },
      "/projects/neural-network-playground/ws": {
        target: "ws://localhost:8000",
        ws: true
      }
    }
  }
});
