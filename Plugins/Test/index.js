module.exports = {
	clientJS: {
		filePath: '/Audio/index.html',
		script: 'script.js'
	},

	server: (app, utils, path) => {
		app.get('/cast/*', (request, response) => {
			console.log(path);
			response.send('a');
		});
	}
}