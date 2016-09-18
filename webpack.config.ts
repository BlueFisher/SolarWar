module.exports = {
	entry: ['./bin/web_scripts/main.js'],
	output: {
		path: 'public/scripts',
		filename: 'bundle.js'
	},
	devtool: "source-map",
	module: {
        preLoaders: [
            { test: /\.js$/, loader: "source-map-loader" }
        ]
    },
	externals: {
		jquery: 'window.$'
	},
}