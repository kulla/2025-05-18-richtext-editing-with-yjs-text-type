import { defineConfig } from '@rsbuild/core'
import { pluginReact } from '@rsbuild/plugin-react'

export default defineConfig({
  html: {
    title: 'Rich Text Editing with Yjs Text Type',
  },
  output: {
    assetPrefix: '/2025-05-18-richtext-editing-with-yjs-text-type/',
  },
  plugins: [pluginReact()],
})
