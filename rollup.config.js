
import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import livereload from 'rollup-plugin-livereload'
import serve from 'rollup-plugin-serve'

const plugins = [
    resolve(),
    commonjs(),
    serve({
        contentBase: './demo',
        historyApiFallback: true,
        host: 'localhost',
        port: 8080,
    })
]

export default [
    {
        input: 'dist/init.js',
        output: {
            name: 'Init',
            file: 'demo/init.js',
            format: 'iife'
        },
        plugins
    },{
        input: 'dist/drawPoint.js',
        output: {
            name: 'DrawPoint',
            file: 'demo/drawPoint.js',
            format: 'iife'
        },
        plugins
    }
]