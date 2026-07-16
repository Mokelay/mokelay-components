import path from 'node:path';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

const external = [
  'vue',
  '@vue-flow/core', 'axios', 'echarts', 'element-ui', 'json-editor-vue', 'qrcode', 'vanilla-jsoneditor'
];

export default defineConfig({
  plugins: [vue()],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  test: {
    server: {
      deps: {
        inline: ['element-ui']
      }
    }
  },
  build: {
    lib: {
      entry: {
        index: path.resolve(__dirname, 'src/index.ts'),
        runtime: path.resolve(__dirname, 'src/runtime.ts'),
        'blocks/index': path.resolve(__dirname, 'src/blocks/index.ts'),
        'processors/index': path.resolve(__dirname, 'src/processors/index.ts'),
        'actions/index': path.resolve(__dirname, 'src/actions/index.ts'),
        'layouts/index': path.resolve(__dirname, 'src/layouts/index.ts'),
        'datasource/index': path.resolve(__dirname, 'src/datasource/index.ts'),
        'pages/index': path.resolve(__dirname, 'src/pages/index.ts'),
        'global-calls': path.resolve(__dirname, 'src/global-calls.ts'),
        'global-settings': path.resolve(__dirname, 'src/global-settings.ts')
      },
      formats: ['es']
    },
    cssFileName: 'style',
    rollupOptions: {
      external: id => external.some(name => id === name || id.startsWith(`${name}/`)),
      output: { preserveModules: true, preserveModulesRoot: 'src', entryFileNames: '[name].js' }
    }
  }
});
