import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  const backendTarget = env.VITE_BACKEND_PROXY_TARGET || 'http://127.0.0.1:1309';

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (
                ['react', 'react-dom', 'react-router-dom'].some((pkg) =>
                  id.includes(`node_modules/${pkg}`),
                )
              ) {
                return 'vendor';
              }
              if (
                [
                  '@radix-ui',
                  'radix-ui',
                  'lucide-react',
                  'class-variance-authority',
                  'clsx',
                  'tailwind-merge',
                  'framer-motion',
                  'motion',
                ].some((pkg) => id.includes(`node_modules/${pkg}`))
              ) {
                return 'ui';
              }
            }
          },
        },
      },
    },
    server: {
      host: true,
      allowedHosts: true,
      hmr: process.env.DISABLE_HMR !== 'true',
      proxy: {
        '/api': {
          target: backendTarget,
          changeOrigin: true,
          xfwd: true,
        },
      },
    },
  };
});
