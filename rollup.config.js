
import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'

export default {
    input: 'dist/init.js',
    output: {
        name: 'init',
        file: 'demo/init.js',
        format: 'iife' //兼容模式
    },
    plugins: [
        resolve(),
        commonjs()
    ]
}