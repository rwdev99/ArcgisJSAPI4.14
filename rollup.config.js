
import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import serve from 'rollup-plugin-serve'

const plugins = [
    resolve({preferBuiltins: true, mainFields: ['browser']}),
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
            name: 'init',
            file: 'demo/init.js',
            format: 'iife'
        },
        plugins
    },{
        input: 'dist/drawPoint.js',
        output: {
            name: 'drawPoint',
            file: 'demo/drawPoint.js',
            format: 'iife'
        },
        plugins
    },{
        input: 'dist/drawPolyline.js',
        output: {
            name: 'drawPolyline',
            file: 'demo/drawPolyline.js',
            format: 'iife'
        },
        plugins
    },{
        input: 'dist/drawPolygon.js',
        output: {
            name: 'drawPolygon',
            file: 'demo/drawPolygon.js',
            format: 'iife'
        },
        plugins
    },{
        input: 'dist/layerWorldFile.js',
        output: {
            name: 'layerWorldFile',
            file: 'demo/layerWorldFile.js',
            format: 'iife'
        },
        plugins
    },{
        input: 'dist/googleMap.js',
        output: {
            name: 'googleMap',
            file: 'demo/googleMap.js',
            format: 'iife'
        },
        plugins
    }
]