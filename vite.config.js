import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  build: {
    target: 'es2015',
    cssCodeSplit: true,
    reportCompressedSize: false, // faster CI builds

    rollupOptions: {
      output: {
        // ── Manual chunk splitting ──────────────────────────────────────────
        // Splits the 773 KB monolith into cacheable pieces so repeat visitors
        // only re-download changed chunks.
        manualChunks(id) {
          // React core — tiny, almost never changes
          if (
            id.includes('node_modules/react/') ||
            id.includes('node_modules/react-dom/') ||
            id.includes('node_modules/scheduler/')
          ) return 'react-vendor';

          // Router — changes rarely
          if (id.includes('node_modules/react-router')) return 'router';

          // Firebase auth (small, needed early)
          if (
            id.includes('@firebase/auth') ||
            id.includes('firebase/auth')
          ) return 'firebase-auth';

          // Firestore (large ~200 KB gzip) — load separately
          if (
            id.includes('@firebase/firestore') ||
            id.includes('firebase/firestore')
          ) return 'firebase-db';

          // Firebase app core
          if (
            id.includes('@firebase/app') ||
            id.includes('firebase/app') ||
            id.includes('@firebase/util') ||
            id.includes('@firebase/component') ||
            id.includes('@firebase/logger')
          ) return 'firebase-core';

          // xlsx — only needed in admin, already lazy-loaded via AdminDashboard
          if (id.includes('node_modules/xlsx')) return 'xlsx-lib';

          // react-helmet-async
          if (id.includes('node_modules/react-helmet')) return 'helmet';
        },

        // Consistent hashed filenames for long-term caching
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },

    chunkSizeWarningLimit: 600,
  },

  // ── esbuild (default minifier) ─────────────────────────────────────────────
  esbuild: {
    // Only drop console/debugger in production builds (safe for all Node versions)
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
    legalComments: 'none',
  },
})
