module.exports = {
	entry: ['./bin/web_scripts/main.js'],
	output: {
		path: 'public/scripts',
		filename: 'bundle.js'
	},
	externals: {
		jquery: 'window.$'
	},
}