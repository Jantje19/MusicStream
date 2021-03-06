module.exports = {
	start: function (dirname, fileHandler, fs, os, settings, utils, querystring, id3, ytdl, version, https, URLModule, ffmpeg, path, serverPlugins, hijackRequestPlugins) {
		const MobileDetect = require('mobile-detect');
		const express = require('express');
		const app = express();

		app.get('*manifest.json*', (request, response) => {
			fs.readFile(path.join(dirname, 'Assets/Icons/manifest.json'), 'utf-8', (err, data) => {
				if (err)
					response.status(500).send('Server error');
				else {
					if (!new MobileDetect(request.headers['user-agent']).mobile())
						data = data.replace('[[STARTURL]]', settings.url.val);
					else {
						const url = new URL(settings.url.val);

						url.pathname = '/mobile/';
						data = data.replace('[[STARTURL]]', url.toString());
					}

					response.setHeader('Content-Type', 'application/json');
					response.send(data);
				}
			});
		});

		const port = settings.port.val || 8000;
		const ips = utils.getLocalIP(os);

		app.get('*favicon.ico*', (_, response) => {
			utils.sendFile(fs, dirname + 'Assets/Icons/favicon.ico', response);
		});

		const imports = {
			fs,
			os,
			id3,
			ytdl,
			utils,
			https,
			URLModule,
			fileHandler,
			querystring
		}

		const availableData = {
			version: version,
			serverURL: ips[0] + ':' + port,
		}

		// Handles plugins hijack functions
		if (hijackRequestPlugins.length > 0) {
			app.use((request, response, next) => {
				let preventDefaultFuncIndex = -1;
				const preventDefaultFuncs = [];
				const preventDefaultNextFunc = () => {
					preventDefaultFuncIndex++;

					if (preventDefaultFuncIndex >= preventDefaultFuncs.length) {
						if (!response.headerSent && !response.headersSent)
							next();
						else
							console.wrn('Plugins - hijackRequest', 'Headers already sent');
					} else {
						const arrVal = preventDefaultFuncs[preventDefaultFuncIndex];
						arrVal[0].func(request, response, preventDefaultNextFunc, imports, arrVal[1]);
					}
				}

				hijackRequestPlugins.forEach((object, key) => {
					const data = Object.assign({}, availableData);

					data.path = `${__dirname}/Plugins/${object.pluginFolder}/`;
					if (object.func) {
						if (typeof object.func == 'function') {
							if (object.preventDefault != true)
								object.func(request, response, imports, data);
							else
								preventDefaultFuncs.push([object, data]);
						} else console.wrn(object.func + ' is not a function');
					}
				});

				if (preventDefaultFuncs.length > 0)
					preventDefaultNextFunc();
				else
					next();
			});
		}

		app.get('*/all.js', (request, response) => {
			console.log(utils.logDate() + ' Got a request for ' + request.url);
			utils.sendFile(fs, path.join(dirname, 'all.js'), response);
		});

		app.get('*/all.css', (request, response) => {
			console.log(utils.logDate() + ' Got a request for ' + request.url);
			utils.sendFile(fs, path.join(dirname, 'all.css'), response);
		});

		app.get('*/seekbarStyle.css', (request, response) => {
			console.log(utils.logDate() + ' Got a request for ' + request.url);
			utils.sendFile(fs, path.join(dirname, 'seekbarStyle.css'), response);
		});

		app.get('*/Assets/*', (request, response) => {
			// console.log(utils.logDate() + ' Got a request for ' + request.url);
			response.header('Cache-Control', 'public, max-age=31536000'); // Cache for a year
			utils.sendFile(fs, path.join(dirname, request.url.replace('videos/', '')), response);
		});

		app.get('/mobile-assets/*', (request, response) => {
			console.log(utils.logDate() + ' Got a request for ' + request.url);
			response.header('Cache-Control', 'public, max-age=31536000'); // Cache for a year
			utils.sendFile(fs, path.join(dirname, 'Mobile/', request.url), response);
		});

		app.get('/mobile/favicon.ico', (request, response) => {
			console.log(utils.logDate() + ' Got a request for ' + request.url);

			response.header('Cache-Control', 'public, max-age=31536000'); // Cache for a year
			response.sendFile(path.join(dirname, './Assets/Icons/favicon.ico'));
		});

		app.get('/help/', (request, response) => {
			console.log(utils.logDate() + ' Got a request for ' + request.url);
			utils.sendFile(fs, path.join(dirname, 'help.html'), response);
		});

		app.get('/settings/', (request, response) => {
			console.log(utils.logDate() + ' Got a request for ' + request.url);
			utils.sendFile(fs, path.join(dirname, 'settings.html'), response);
		});

		app.get('/LoadPluginJS/:filePath', (request, response) => {
			const url = querystring.unescape(request.url);
			console.log(utils.logDate() + ' Got a request for ' + url);

			utils.sendFile(fs, path.join(__dirname, '/Plugins/', filePath), response);
		});

		app.get('/OldBrowsers/*', (request, response) => {
			const url = request.url;

			console.log(utils.logDate() + ' Got a request for ' + url);

			fileHandler.getJSON(fs, os, path, utils, settings).then(json => {
				let html = '';
				const settings = require('./settings.js');

				json.audio.songs.forEach((object) => {
					if (!settings.ignoredAudioFiles.val.includes(object.fileName))
						html += `<a href="/song/${object.fileName}" target="_blank">${object.fileName}</a>`;
				});

				response.send(html);
			}).catch(err => response.status(404).send('Error: ' + err));
		});

		app.get('/service-worker-mobile.js', (_, response) => {
			response.sendFile(path.join(dirname, './Audio/service-worker.js'));
		});

		require('./APIManager.js')(
			app,
			dirname,
			fileHandler,
			fs,
			os,
			path,
			settings,
			utils,
			id3,
			https,
			querystring,
			URLModule,
			ytdl,
			ffmpeg
		);

		// Plugins
		if (serverPlugins) {
			class PluginServerHandler {
				constructor(name) {
					this.pluginName = name;
				}

				addGetRequest(...args) {
					if (args.length > 1) {
						args.forEach((object, key) => {
							app.get(`/${this.pluginName}/${object.name}*`, object.func);
						});
					} else {
						args = args[0];

						if (Array.isArray(args)) {
							args.forEach((object, key) => {
								app.get(`/${this.pluginName}/${object.name}*`, object.func);
							});
						} else {
							app.get(`/${this.pluginName}/${args.name}*`, args.func);
						}
					}
				}

				addPostRequest(...args) {
					if (args.length > 0) {
						args.forEach((object, key) => {
							app.post(`/${this.pluginName}/${object.name}*`, object.func);
						});
					} else {
						args = args[0];

						if (Array.isArray(args)) {
							args.forEach((object) => {
								app.post(`/${this.pluginName}/${object.name}*`, object.func);
							});
						} else {
							app.post(`/${this.pluginName}/${args.name}*`, args.func);
						}
					}
				}
			}

			serverPlugins.forEach((object) => {
				const data = Object.assign({}, availableData);
				const server = new PluginServerHandler(object.folder);

				data.path = `${__dirname}/Plugins/${object.folder}/`;
				object.func(server, imports, data);
			});
		}

		// Just handle the rest
		app.get('*', (request, response) => {
			const url = URLModule.parse(request.url).pathname;
			console.log(utils.logDate() + ' Got a request for ' + url);

			if (url.startsWith('/videos'))
				utils.sendFile(fs, path.join(dirname, 'Video/', url.replace('/videos/', '')), response);
			else if (url.startsWith('/mobile'))
				if (url.indexOf('.') < 0)
					utils.sendFile(fs, path.join(dirname, 'Mobile/index.html'), response);
				else
					utils.sendFile(fs, path.join(dirname, 'Mobile/', url.replace('/mobile/', '')), response);
			else if (url.startsWith('/')) {
				if (new MobileDetect(request.headers['user-agent']).mobile() && !url.toLowerCase().includes('service')) {
					const cookies = querystring.parse(request.headers['cookie'], '; ')

					if ('use-desktop' in cookies && cookies['use-desktop'].toLowerCase() === 'true')
						response.cookie('use-desktop', 'true', { maxAge: 2592000 });
					else {
						response.cookie('used-mobile', 'true', { maxAge: 2592000 });
						response.redirect('/mobile/');
						return;
					}
				}

				utils.sendFile(fs, path.join(dirname, 'Audio/', url), response);
			} else
				response.send('500: Server error');
		});

		app.listen(port, err => {
			if (err)
				throw err;
			else {
				ips.forEach((object) => {
					utils.colorLog(`${utils.logDate()} Server is running on: [[fgGreen, ${object}:${port}]]`, 'reset');
				});
			}
		});
	}
}