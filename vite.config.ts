import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { prerender } from "vite-plugin-prerender";
import prerenderRoutes from "./prerender-routes.json";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
    // Pre-rendering for static generation
    mode === 'production' && prerender({
      routes: prerenderRoutes,
      postProcess(renderedRoute) {
        // Ensure canonical URLs are properly set in the generated HTML
        const { html } = renderedRoute;
        const url = new URL(renderedRoute.route, 'https://ottocollect.com');
        const canonicalUrl = url.href;
        
        // Inject canonical URL into the HTML
        const updatedHtml = html.replace(
          /<head[^>]*>/,
          `$&<link rel="canonical" href="${canonicalUrl}" />`
        );
        
        return {
          ...renderedRoute,
          html: updatedHtml
        };
      }
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'esbuild',
    target: 'es2015', // Target modern browsers for better performance
    cssCodeSplit: true, // Split CSS for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-tabs'],
          i18n: ['react-i18next', 'i18next'],
          supabase: ['@supabase/supabase-js'],
        },
        // Optimize chunk names for better caching
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    // Optimize chunk size warnings
    chunkSizeWarningLimit: 1000,
  },
  preview: {
    port: 8080,
    host: "::",
  },
}));
