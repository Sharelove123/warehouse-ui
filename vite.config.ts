import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const host = process.env.HOST || '127.0.0.1';
const parsedPort = Number(process.env.PORT);
const port = Number.isFinite(parsedPort) && parsedPort > 0 ? parsedPort : 5173;

const resolvedApiBaseUrl = (
  process.env.API_BASE_URL ||
  process.env.VITE_API_BASE_URL ||
  process.env.REACT_APP_API_BASE_URL ||
  'http://127.0.0.1:8000'
).replace(/\/+$/, '');

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    __APP_API_BASE_URL__: JSON.stringify(resolvedApiBaseUrl),
  },
  server: {
    host,
    port,
    strictPort: false,
    allowedHosts: true,
  },
  preview: {
    host,
    port,
  },
});
