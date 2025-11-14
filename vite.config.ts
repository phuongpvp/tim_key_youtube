import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // FIX LỖI TRẮNG TRANG (404)
  base: './', 

  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  plugins: [react()],
  // Bỏ phần "define" đi vì không cần nữa
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  }
});