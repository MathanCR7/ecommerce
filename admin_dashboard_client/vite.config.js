// client/vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc"; // Or @vitejs/plugin-react if you use that

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Listen on all addresses (0.0.0.0), crucial for Docker container accessibility
    port: 5170, // The port Vite runs on *inside* the container
    // Optional: Configure HMR port if needed (usually works automatically with host: true)
    // hmr: {
    //   clientPort: 5170 // The port the browser connects to on the host
    // },
    // Optional: Enable polling if hot-reloading doesn't work reliably with Docker volumes
    // watch: {
    //   usePolling: true,
    // },
  },
});
