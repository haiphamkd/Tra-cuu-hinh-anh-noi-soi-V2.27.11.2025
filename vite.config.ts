import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Polyfill process.env safely to avoid "process is not defined" error in browser
    // We explicitly define API_KEY if needed, or an empty object to satisfy the SDK checks
    'process.env': {
      API_KEY: process.env.API_KEY || ''
    }
  }
});