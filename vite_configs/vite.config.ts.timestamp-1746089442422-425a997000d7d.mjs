// vite.config.ts
import { defineConfig } from "file:///Users/langton/Documents/dev/CI/rapids/rapids-ui-navigator/node_modules/vite/dist/node/index.js";
import react from "file:///Users/langton/Documents/dev/CI/rapids/rapids-ui-navigator/node_modules/@vitejs/plugin-react-swc/index.mjs";
import path from "path";
var __vite_injected_original_dirname = "/Users/langton/Documents/dev/CI/rapids/rapids-ui-navigator";
var vite_config_default = defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080
  },
  plugins: [
    react()
    //mode === 'development' &&
    // componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    }
  },
  build: {
    minify: false,
    // Disable minification
    sourcemap: false,
    // Disable source maps
    cssMinify: false
    // Disable CSS minification
  }
}));
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvbGFuZ3Rvbi9Eb2N1bWVudHMvZGV2L0NJL3JhcGlkcy9yYXBpZHMtdWktbmF2aWdhdG9yXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvVXNlcnMvbGFuZ3Rvbi9Eb2N1bWVudHMvZGV2L0NJL3JhcGlkcy9yYXBpZHMtdWktbmF2aWdhdG9yL3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9Vc2Vycy9sYW5ndG9uL0RvY3VtZW50cy9kZXYvQ0kvcmFwaWRzL3JhcGlkcy11aS1uYXZpZ2F0b3Ivdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tIFwidml0ZVwiO1xuaW1wb3J0IHJlYWN0IGZyb20gXCJAdml0ZWpzL3BsdWdpbi1yZWFjdC1zd2NcIjtcbmltcG9ydCBwYXRoIGZyb20gXCJwYXRoXCI7XG4vLyBpbXBvcnQgeyBjb21wb25lbnRUYWdnZXIgfSBmcm9tIFwibG92YWJsZS10YWdnZXJcIjtcblxuLy8gaHR0cHM6Ly92aXRlanMuZGV2L2NvbmZpZy9cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZygoeyBtb2RlIH0pID0+ICh7XG4gIHNlcnZlcjoge1xuICAgIGhvc3Q6IFwiOjpcIixcbiAgICBwb3J0OiA4MDgwLFxuICB9LFxuICBwbHVnaW5zOiBbXG4gICAgcmVhY3QoKSxcbiAgICAvL21vZGUgPT09ICdkZXZlbG9wbWVudCcgJiZcbiAgICAvLyBjb21wb25lbnRUYWdnZXIoKSxcbiAgXS5maWx0ZXIoQm9vbGVhbiksXG4gIHJlc29sdmU6IHtcbiAgICBhbGlhczoge1xuICAgICAgXCJAXCI6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwiLi9zcmNcIiksXG4gICAgfSxcbiAgfSxcbiAgYnVpbGQ6IHtcbiAgICBtaW5pZnk6IGZhbHNlLCAgICAgICAvLyBEaXNhYmxlIG1pbmlmaWNhdGlvblxuICAgIHNvdXJjZW1hcDogZmFsc2UsICAgLy8gRGlzYWJsZSBzb3VyY2UgbWFwc1xuICAgIGNzc01pbmlmeTogZmFsc2UsICAgIC8vIERpc2FibGUgQ1NTIG1pbmlmaWNhdGlvblxuICB9LFxufSkpO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUFnVyxTQUFTLG9CQUFvQjtBQUM3WCxPQUFPLFdBQVc7QUFDbEIsT0FBTyxVQUFVO0FBRmpCLElBQU0sbUNBQW1DO0FBTXpDLElBQU8sc0JBQVEsYUFBYSxDQUFDLEVBQUUsS0FBSyxPQUFPO0FBQUEsRUFDekMsUUFBUTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sTUFBTTtBQUFBLEVBQ1I7QUFBQSxFQUNBLFNBQVM7QUFBQSxJQUNQLE1BQU07QUFBQTtBQUFBO0FBQUEsRUFHUixFQUFFLE9BQU8sT0FBTztBQUFBLEVBQ2hCLFNBQVM7QUFBQSxJQUNQLE9BQU87QUFBQSxNQUNMLEtBQUssS0FBSyxRQUFRLGtDQUFXLE9BQU87QUFBQSxJQUN0QztBQUFBLEVBQ0Y7QUFBQSxFQUNBLE9BQU87QUFBQSxJQUNMLFFBQVE7QUFBQTtBQUFBLElBQ1IsV0FBVztBQUFBO0FBQUEsSUFDWCxXQUFXO0FBQUE7QUFBQSxFQUNiO0FBQ0YsRUFBRTsiLAogICJuYW1lcyI6IFtdCn0K
