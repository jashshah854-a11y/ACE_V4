import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    sourcemap: mode === 'development',
    chunkSizeWarningLimit: 1024,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react')) return 'react-vendor';
            if (id.includes('@tanstack') || id.includes('react-router-dom')) return 'data-routing';
            if (id.includes('framer-motion') || id.includes('recharts') || id.includes('swiper')) return 'viz';
            if (id.includes('@radix-ui') || id.includes('lucide-react')) return 'ui-kit';
            return 'vendor';
          }
        },
      },
    },
  },
}));
