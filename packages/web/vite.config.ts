import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  server: {
    host: "0.0.0.0",
    port: parseInt(process.env.PORT || "5173"),
    allowedHosts: true,
    proxy: {
      "/api": {
        target: `http://localhost:${process.env.API_PORT || "3000"}`,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
      "/share": {
        target: `http://localhost:${process.env.API_PORT || "3000"}`,
        changeOrigin: true,
      },
    },
  },
});
