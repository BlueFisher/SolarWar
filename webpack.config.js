module.exports = {
	entry: ['./bin/web_core/main.js'],
	output: {
		path: 'public/scripts',
		filename: 'bundle.js'
	},
	module: {
		preLoaders: [
			{ test: /\.js$/, loader: "source-map-loader" }
		]
	},
	externals: {
		vue: "window.Vue",
		jquery: 'window.$',
		toastr: 'window.toastr'
	},
};