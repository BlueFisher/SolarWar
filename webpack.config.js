module.exports = {
	entry: ['./lib/web_core/main.js'],
	output: {
		path: 'public/scripts',
		filename: 'bundle.js'
	},
	module: {
		preLoaders: [
			{ test: /\.js$/, loader: "source-map-loader" }
		],
		loaders: [
			{
				test: /\.js$/,
				exclude: /(node_modules|bower_components)/,
				loader: 'babel',
				query: {
					presets: ['es2015']
				}
			}
		]
	},
	externals: {
		vue: "window.Vue",
		jquery: 'window.$',
		toastr: 'window.toastr'
	},
};