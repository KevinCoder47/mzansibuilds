import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    css: true,
    coverage: {
      reporter: ['text', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/__tests__/**', 'src/main.tsx'],
    },
  },
  define: {
    // Prevents "import.meta.env.VITE_API_URL is not defined" in api.ts during tests
    'import.meta.env.VITE_API_URL': JSON.stringify('http://localhost:3000/api'),
  },
});
