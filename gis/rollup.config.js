import resolve from '@rollup/plugin-node-resolve';

export default {
  input: 'gis/app.js',
  output: [
    {
      format: 'esm',
      file: 'gis/bundle.js'
    },
  ],
  plugins: [
    resolve(),
  ]
};