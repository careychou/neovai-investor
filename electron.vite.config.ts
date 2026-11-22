import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

const at = (p: string) => path.resolve(__dirname, p)

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin({ exclude: ['neovai-kernel'] })],
    build: { rollupOptions: { input: at('shell/main/index.ts') } }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: { rollupOptions: { input: at('shell/preload/index.ts') } }
  },
  renderer: {
    root: at('shell/renderer'),
    plugins: [react()],
    resolve: { dedupe: ['react', 'react-dom'] },
    server: { fs: { allow: [at('.')] } },
    build: { rollupOptions: { input: at('shell/renderer/index.html') } }
  }
})
