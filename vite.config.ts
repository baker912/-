import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from "vite-tsconfig-paths";
import viteCompression from 'vite-plugin-compression';
import { traeBadgePlugin } from 'vite-plugin-trae-solo-badge';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths(),
    viteCompression({
      verbose: true,
      disable: false,
      threshold: 10240, // Compress files > 10kb
      algorithm: 'gzip',
      ext: '.gz',
    })
  ],
  build: {
    sourcemap: false, // Disable sourcemaps for production to save space/time
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom', 'zustand'],
          'vendor-antd': ['antd', '@ant-design/icons'],
          'vendor-charts': ['echarts', 'echarts-for-react'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-utils': ['dayjs', 'clsx', 'tailwind-merge'],
          // Let xlsx be split automatically as it's only used in Dashboard
        }
      }
    },
    chunkSizeWarningLimit: 1000,
  },
})
