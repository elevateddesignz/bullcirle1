import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const parseFlag = (value?: string) => {
    if (!value) return false;
    const normalized = value.trim().toLowerCase();
    return normalized === 'true' || normalized === '1';
  };

  const devProxyEnabled = parseFlag(env.VITE_DEV_PROXY);
  const apiProxyTarget =
    env.VITE_PROXY_API_TARGET
    || env.VITE_BACKEND_URL
    || env.VITE_API_URL
    || 'http://localhost:3000';

  const supabaseProxyTarget =
    env.VITE_PROXY_SUPABASE_TARGET
    || apiProxyTarget;

  const buildProxyConfig = () => {
    if (!devProxyEnabled) return undefined;

    const createProxy = (target: string) => ({
      target,
      changeOrigin: true,
      secure: target.startsWith('https'),
    });

    return {
      '/api': createProxy(apiProxyTarget),
      '/supabase': createProxy(supabaseProxyTarget),
    };
  };

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg}']
        }
      }),
    ],
    define: {
      __APP_ENV__: JSON.stringify(env.APP_ENV),
    },
    server: {
      port: 5173,
      host: true,
      watch: { 
        usePolling: true 
      },
      proxy: buildProxyConfig(),
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            router: ['react-router-dom'],
            ui: ['lucide-react', 'framer-motion'],
          },
        },
      },
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-router-dom'],
    },
  };
});
