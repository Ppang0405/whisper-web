import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react()
  ],
  // Set base path for GitLab Pages deployment
  // This ensures assets are loaded correctly when deployed as subdirectory
  base: process.env.CI_PAGES_URL ? './' : '/',
  build: {
    // Ensure clean build
    emptyOutDir: true,
    // Generate sourcemaps for debugging
    sourcemap: true,
    // Optimize chunk splitting for better loading
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor code for better caching
          vendor: ['react', 'react-dom'],
          // Split transformers library (large dependency)
          transformers: ['@xenova/transformers']
        }
      }
    }
  }
})
