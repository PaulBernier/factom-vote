const path = require('path');

module.exports = {
    mode: 'production',
    entry: { 
        'factom-vote': './src/factom-vote.js',
        'factom-vote-struct': './src/factom-vote-struct.js'
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].js',
        library: '[name]',
        libraryTarget: 'umd'
    },
    module: {
        rules: [{
            test: /\.js$/,
            exclude: /(node_modules|bower_components)/,
            use: {
                loader: 'babel-loader',
                options: {
                    presets: ['env'],
                    plugins: ['transform-runtime', 'transform-async-to-generator']
                }
            }
        }]
    },
};