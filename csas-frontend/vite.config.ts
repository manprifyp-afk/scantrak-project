import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// React + Tailwind v4 (via the official Vite plugin — no tailwind.config.js).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5173 },
});
