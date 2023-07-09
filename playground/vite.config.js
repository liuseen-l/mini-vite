import { defineConfig } from 'vitex'
import vue from '@vitejs/plugin-vue'

// import { lessPlugin } from './plugins/less'

export default defineConfig({
  // plugins: [lessPlugin()],
  plugins: [vue()],
})
