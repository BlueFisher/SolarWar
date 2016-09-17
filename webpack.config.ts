module.exports = {
	entry: ['./bin/scripts/main.js'],
	output: {
		path: 'public/scripts',
		filename: 'bundle.js'
	},
	externals: {
		jquery: 'window.$',
		Dragdealer: 'Dragdealer'
	},
}