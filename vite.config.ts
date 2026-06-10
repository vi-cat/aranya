import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'
import { k8sApiPlugin } from './server/k8sApi'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), svgr(), k8sApiPlugin()],
  css: {
    modules: {
      // lets CSS keep kebab-case class names while JSX accesses them as camelCase
      localsConvention: 'camelCase',
    },
  },
})
