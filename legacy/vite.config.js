import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Carrega .env, .env.local, .env.production etc. (mesmas credenciais indexadas localmente)
  loadEnv(mode, process.cwd(), '');

  return {
    logLevel: 'info',
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    server: {
      port: 3002,
      strictPort: true,
      open: true,
    },
    plugins: [react()],
  };
});
