const tmpQueueSave = { audio: { global: {} }, videos: {} };

module.exports = {
	start: function (dirname, fileHandler, fs, os, settings, utils, querystring, id3, ytdl, version, https, URLModule, ffmpeg, path, serverPlugins, hijackRequestPlugins) {
		const MobileDetect = require('mobile-detect');
		const compression = require('compression');
		const express = require('express');
		const app = express();

		app.get('*manifest.json*', (_, response) => {
			fs.readFile(path.join(dirname, 'Assets/Icons/manifest.json'), 'utf-8', (err, data) => {
				if (err)
					response.status(500).send('Server error');
				else {
					response.setHeader('Content-Type', 'application/json');
					response.send(data.replace('[[STARTURL]]', settings.url.val));
				}
			});
		});

		// HTTPS Support
		let httpsServer;
		const httpsSupport = utils.httpsArgs();

		if (httpsSupport) {
			const privateKey = fs.readFileSync(httpsSupport.key);
			const certificate = fs.readFileSync(httpsSupport.cert);
			const credentials = { key: privateKey, cert: certificate };

			if ('HSTS' in httpsSupport) {
				const hstsValue = httpsSupport.HSTS;
				if (hstsValue !== false) {
					const maxAge = ((typeof (hstsValue) === typeof (true)) ? 31536000 : hstsValue);
					const headerValue = `max-age=${maxAge}; includeSubDomains; preload`;

					app.use((request, response, next) => {
						response.setHeader('Strict-Transport-Security', ((typeof (hstsValue) === typeof ('')) ? hstsValue : headerValue));
						next();
					});
				}
			}

			httpsServer = https.createServer(credentials, app);
		}
		//

		const port = settings.port.val || 8000;
		const ips = utils.getLocalIP(os);

		app.use(compression());

		app.get('*favicon.ico*', (_, response) => {
			utils.sendFile(fs, dirname + 'Assets/Icons/favicon.ico', response);
		});

		const imports = {
			fs: fs,
			os: os,
			id3: id3,
			ytdl: ytdl,
			utils: utils,
			https: https,
			URLModule: URLModule,
			fileHandler: fileHandler,
			querystring: querystring
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
			console.log(utils.logDate() + ' Got a request for ' + request.url);
			utils.sendFile(fs, path.join(dirname, request.url.replace('videos/', '')), response);
		});

		app.get('/mobile-assets/*', (request, response) => {
			console.log(utils.logDate() + ' Got a request for ' + request.url);
			utils.sendFile(fs, path.join(dirname, 'Mobile/', request.url), response);
		});

		app.get('/mobile/favicon.ico', (request, response) => {
			console.log(utils.logDate() + ' Got a request for ' + request.url);
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
			const url = request.url.replace(/\?(\w+)=(.+)/, '');
			console.log(utils.logDate() + ' Got a request for ' + url);

			if (url.startsWith('/videos'))
				utils.sendFile(fs, path.join(dirname, 'Video/', url.replace('/videos/', '')), response);
			else if (url.startsWith('/mobile'))
				if (url.indexOf('.') < 0)
					utils.sendFile(fs, path.join(dirname, 'Mobile/index.html'), response);
				else
					utils.sendFile(fs, path.join(dirname, 'Mobile/', url.replace('/mobile/', '')), response);
			else if (url.startsWith('/')) {
				if (new MobileDetect(request.headers['user-agent']).mobile()) {
					const cookies = querystring.parse(request.headers['cookie'], '; ')

					if ('use-desktop' in cookies && cookies['use-desktop'].toLowerCase() === 'true')
						response.cookie('use-desktop', 'true', { maxAge: 2592000 });
					else {
						response.redirect('/mobile/');
						return;
					}
				}

				utils.sendFile(fs, path.join(dirname, 'Audio/', url), response);
			} else
				response.send('500: Server error');
		});

		const listenerObject = httpsServer || app;

		listenerObject.listen(port, err => {
			if (err)
				throw err;
			else {
				ips.forEach((object, key) => {
					utils.colorLog(`${utils.logDate()} Server is running on: [[fgGreen, ${object}:${port}]]`, 'reset');
				});
			}
		});
	}
}