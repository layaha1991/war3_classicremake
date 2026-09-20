import { defineConfig } from "vite";

export default defineConfig({
  server: {
    host: true,
    port: 5173,
    proxy: {
      "/api": "http://localhost:2567",
      "/matchmake": "http://localhost:2567",
    },
  },
  optimizeDeps: {
    include: ["phaser", "@colyseus/sdk"],
  },
});
