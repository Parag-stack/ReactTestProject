import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Dev-server proxy — this is how API calls are handled "properly" so the
 * browser never makes a cross-origin request and never triggers a CORS
 * preflight. The app fetches RELATIVE paths (/api/... and /occ-api/...),
 * Vite forwards them to the real upstreams server-side, and the responses
 * come back same-origin.
 *
 *   /api/*       ->  https://omkaradata.com/api/*      (main data hub)
 *   /occ-api/*   ->  https://omkaracapital.in/api/*    (TV bytes endpoint)
 *
 * `changeOrigin: true` rewrites the Host header to the target so the
 * upstream sees a request that looks like it came from its own origin.
 *
 * For PRODUCTION you need the equivalent rewrite at your host. On Vercel,
 * add to vercel.json:
 *   { "rewrites": [
 *       { "source": "/api/:path*",     "destination": "https://omkaradata.com/api/:path*" },
 *       { "source": "/occ-api/:path*", "destination": "https://omkaracapital.in/api/:path*" }
 *   ]}
 * (or front the app with Cloudflare / nginx doing the same path forwarding).
 */
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
    proxy: {
      '/occ-api': {
        target: 'https://omkaracapital.in',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/occ-api/, '/api'),
      },
      '/api': {
        target: 'https://omkaradata.com',
        changeOrigin: true,
        secure: true,
      },
    },
  },
  preview: {
    port: 4173,
    proxy: {
      '/occ-api': {
        target: 'https://omkaracapital.in',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/occ-api/, '/api'),
      },
      '/api': {
        target: 'https://omkaradata.com',
        changeOrigin: true,
        secure: true,
      },
    },
  },
});
