import { defineConfig } from 'viteX'
import { lessPlugin } from './plugins/less'

export default defineConfig({
  plugins: [lessPlugin()],
})
