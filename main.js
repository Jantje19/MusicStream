const fs = require('fs');
const os = require('os');
const https = require('https');
const id3 = require('node-id3');
const URLModule = require('url');
const ytdl = require('ytdl-core');
const pathModule = require('path');
const server = require('./server.js');
const ffmpeg = require('fluent-ffmpeg');
const querystring = require('querystring');
const fileHandler = require('./fileHandler.js');

const settings = require('./settings.js');
const { version } = require('./package.json');

const pluginDomJs = [];
const pluginServer = [];
const mainPageMenu = [];
const hijackRequestPlugins = [];

const loadPlugins = () => {
	return new Promise((resolve, reject) => {
		fileHandler.getPlugins(pathModule, utils, fs).then(plugins => {
			if (plugins.length > 0) {
				utils.colorLog(utils.logDate() + ' Loading plugins...', 'bgGreen');

				// Loop through every plugin and handle the functions
				plugins.forEach(object => {
					if (!object.notfound) {
						// If it is a function just run it
						if ((typeof object.module).toLowerCase() == 'function') {
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

							const data = {
								version: version,
								path: pathModule.join(__dirname, '/Plugins/', object.pluginFolder),
								serverURL: utils.getLocalIP(os)[0] + ':' + (settings.port || 8000)
							}

							object.module(imports, data);
						} else {
							if (object.module.clientJS) {
								const handle = obj => {
									obj.pluginFolder = object.folder;
									pluginDomJs.push(obj);
								}

								if (Array.isArray(object.module.clientJS))
									object.module.clientJS.forEach(handle);
								else
									handle(object.module.clientJS);
							}

							if (object.module.server) {
								pluginServer.push({
									folder: object.folder,
									func: object.module.server
								});

								if (object.module.menu) {
									object.module.menu.name = object.module.menu.name || object.folder;

									if (object.module.menu.url)
										object.module.menu.url = object.folder + object.module.menu.url;
									else
										object.module.menu.url = object.folder;

									mainPageMenu.push(object.module.menu);
								}
							}

							if (object.module.hijackRequests) {
								object.module.hijackRequests.pluginFolder = object.folder;
								hijackRequestPlugins.push(object.module.hijackRequests);
							}
						}
					}

					console.log(utils.logDate() + ' Loaded', object.folder);
				});

				resolve();
			} else {
				utils.colorLog('No plugins found. Starting server...', 'bgGreen');
				resolve();
			}
		}).catch(err => {
			reject(err);
		});
	});
}

const startServer = () => {
	loadPlugins().then(() => {
		utils.colorLog(utils.logDate() + ' Plugins loaded', 'bgGreen');
		const startServerModule = () => server.start(pathModule.join(__dirname, '/WebInterface/'), fileHandler, fs, os, settings, utils, querystring, id3, ytdl, version, https, URLModule, ffmpeg, pathModule, pluginServer, hijackRequestPlugins);

		if (settings.updateJsonOnStart.val == true) {
			fileHandler.searchSystem(fs, os, pathModule, utils, settings).then(startServerModule).catch(err => {
				console.err('Couln\'t update the JSON file.', err);
				startServerModule();
			});
		} else startServerModule();
	}).catch(err => {
		console.err('Error loading plugins:', err);
	});
}

// Usefull functions
const utils = {
	/*
	*	Returns a formatted string of the time
	*
	*	@return {String}
	*/
	logDate: () => {
		const date = new Date();

		function convertToDoubleDigit(num) {
			if (num.toString().length < 2)
				return "0" + num;
			else
				return num;
		}

		return `${convertToDoubleDigit(date.getHours())}:${convertToDoubleDigit(date.getMinutes())}:${convertToDoubleDigit(date.getSeconds())}`;
	},

	/*
	*	Gets the file extension
	*
	*	@param {String} filename
	*	@return {String}
	*/
	getFileExtension: fileName => {
		return pathModule.extname(fileName).toLowerCase();
	},

	/*
	*	Fetches the image from url
	*
	*	@param {String} url
	*		The image url
	*	@return {Promise}
	*/
	getImage: url => {
		return new Promise((resolve, reject) => {
			Stream = require('stream').Transform;

			https.request(url, response => {
				const data = new Stream();

				response.on('data', chunk => {
					data.push(chunk);
				});

				response.on('error', reject);
				response.on('end', () => {
					const buffer = data.read();

					if (buffer instanceof Buffer)
						resolve(buffer);
					else
						reject('Not a buffer');
				});
			}).end();
		});
	},

	/*
	*	Checks if file exists
	*
	*	@param {String} path
	*	@param {Number} [mode=F_OK]
	*	@return {Boolean}
	*/
	fileExists: (path, mode = fs.constants.F_OK) => {
		return new Promise((resolve, reject) => {
			fs.promises.access(path, mode).then(exists => {
				resolve(exists !== false);
			}).catch(err => {
				if (err.code === 'ENOENT')
					resolve(false);
				else
					reject(err);
			});
		});
	},

	/*
	*	Sorts json based on key and content
	*
	*	@param {Object} json
	*	@return {Array}
	*/
	sortJSON: json => {
		const newArr = [];

		for (key in json)
			newArr.push([key, json[key]]);

		newArr.sort((a, b) => { return a[1] - b[1] });
		newArr.reverse();
		return newArr;
	},

	/*
	*	Parses JSON with Promise instead of Error
	*
	*	@param {String} str
	*	@return {Promise<Object>}
	*/
	safeJSONParse: str => {
		return new Promise((resolve, reject) => {
			try {
				resolve(JSON.parse(str));
			} catch (err) {
				reject(err);
			}
		});
	},

	/*
	*	Responsible for sending files and parsing the HTML for the handling plugins
	*
	*	@param {Object} fs
	*		The native NodeJS fs module
	*	@param {String} path
	*		The request path
	*	@param {Object} response
	*		The express response object
	*/
	sendFile: (fs, path, response) => {
		if (path.endsWith(pathModule.sep))
			path = pathModule.join(path, 'index.html');

		utils.fileExists(path).then(exists => {
			if (!exists)
				response.status(404).sendFile(pathModule.join(__dirname, '/WebInterface/404.html'));
			else {
				if (utils.getFileExtension(path) !== '.html')
					response.status(200).sendFile(path)
				else {
					fs.readFile(path, 'utf-8', (err, data) => {
						if (err) {
							console.err(err);
							response
								.status(500)
								.header("Content-Type", "text/html")
								.send('<h1>Internal server error</h1>');
						} else {
							for (key in settings)
								data = data.replace(new RegExp(`\{\{\\s?(${key})\\s?\}\}`, 'g'), settings[key].val);

							// Plugins
							let buttonHTML = '';
							const thisPath = path.replace(__dirname, '').replace('/WebInterface/', '').replace(/\/\//g, '/');
							pluginDomJs.forEach(object => {
								if (thisPath == object.filePath.replace(/^\//, '')) {
									if (!object.script.startsWith('http'))
										data = data.replace('</head>', `<script type="text/javascript" src="/LoadPluginJS/${pathModule.join(object.pluginFolder, '/', object.script)}"></script>\n</head>`)
									else {
										if (object.script.startsWith('http://'))
											console.warn('A plugin is injecting a resource from an insecure (non-https) source');

										data = data.replace('</head>', `<script type="text/javascript" src="${object.script}"></script>\n</head>`);
									}
								}
							});

							if (mainPageMenu.length > 0) {
								mainPageMenu.forEach((object, key) => {
									buttonHTML += `<a href="/${object.url}"><button>${object.name}</button></a>`;
								});
							}

							if (buttonHTML.length > 0)
								buttonHTML = '<hr>' + buttonHTML;

							data = data.replace('[[EXTRABUTTONS]]', buttonHTML);
							response.status(200).send(data);
						}
					});
				}
			}
		}).catch(err => {
			console.error(err);
			response
				.status(500)
				.header("Content-Type", "text/html")
				.send('<h1>Internal server error</h1>');
		});
	},

	/*
	*	Fetches data over https
	*
	*	@param {String} url
	*	@param {Object} https
	*		The native NodeJS https module
	*	@param {Object} URLModule
	*		The native NodeJS url module
	*	@param {Object} (optional) headers
	*		The request headers
	*	@return {Promise}
	*/
	fetch: (url, https, URLModule, headers) => {
		return new Promise((resolve, reject) => {
			const options = URLModule.parse(url);

			options.headers = headers;
			https.get(options, res => {
				let rawData = '';

				const { statusCode } = res;
				const contentType = res.headers['content-type'];

				if (statusCode !== 200) {
					reject('Request Failed.\n' + `Status Code: ${statusCode}`);
					res.resume();
					return;
				}

				res.setEncoding('utf8');

				res.on('data', chunk => { rawData += chunk; });
				res.on('end', () => {
					// If the response is json try to parse
					if (/^application\/json/.test(contentType))
						utils.safeJSONParse(rawData).then(resolve).catch(reject);
					else
						resolve(rawData);
				});
			}).on('error', err => reject(err));
		});
	},

	/*
	*	Hanles POST request
	*
	*	@param {Request} request
	*		NodeJS request object
	*	@param {Boolean} [parseJson=false]
	*		If it should automatically parse JSON if the Content-Type is application/json
	*	@return {Promise}
	*/
	handlePostRequest: (request, parseJSON = true) => {
		return new Promise((resolve, reject) => {
			let body = '';

			request.on('data', data => {
				body += data;

				if (body.length > 1e6) {
					request.connection.destroy();
					reject('The connection was destroyed because the amount of data passed is too much');
				}
			});

			request.on('end', () => {
				if ((request.headers['content-type'] || '').includes('json') && parseJSON) {
					utils.safeJSONParse(body)
						.then(resolve)
						.catch(reject);

					return;
				}

				resolve(body);
			});
		});
	},

	/*
	*	Checks if a new version of MusicStream is available
	*
	*	@param {String} version
	*	@return {Promise}
	*/
	newVersionAvailable: version => {
		/*
		*	Compares versions (duh)
		*
		*	@param {String} version1
		*	@param {String} version2
		*	@return {Boolean}
		*		-1: version1 is smaller than version2
		*		0: version1 is the same as version2
		*		1: version1 is greater than version2
		*/
		function compareVersions(version1, version2) {
			version1 = version1.split('.');
			version2 = version2.split('.');

			if (version1.length == version2.length) {
				for (let i = 0; i < version1.length; i++) {
					const num1 = Number(version1[i]);
					const num2 = Number(version2[i]);

					if (num1 && num2) {
						if (num1 < num2)
							return -1;
						else if (num1 > num2)
							return 1;
					} else {
						if (version1[i] != version2[i])
							return 0;
					}
				}

				return 0;
			} else return 0;
		}

		return new Promise((resolve, reject) => {
			// Github needs a header to be sent
			const header = { 'User-Agent': 'Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 6.0)' };

			console.log(utils.logDate(), 'Checking for updates.');
			console.log(utils.logDate(), 'Connecting to Github...');
			utils.fetch('https://api.github.com/repos/Jantje19/MusicStream/releases/latest', https, URLModule, header).then(response => {
				// Check if the returned value is JSON
				if (response.constructor == {}.constructor) {
					const versionSame = compareVersions(version, response.tag_name);

					if (versionSame == 0)
						resolve({ isAvailable: false, version, githubVersion: response.tag_name, body: response.body });
					else if (versionSame > 0)
						resolve({ isAvailable: false, version, greater: true, url: response.html_url, githubVersion: response.tag_name, body: response.body });
					else if (versionSame < 0)
						resolve({ isAvailable: true, version: response.tag_name, url: response.html_url, githubVersion: response.tag_name, body: response.body });
					else
						reject('Version check went wrong.');
				} else reject('The response is not json, so it is useless');
			}).catch(err => reject(err));
		});
	},

	/*
	*	Prints collored text to the console
	*
	*	@param {String} text
	*	@param {String} color
	*/
	colorLog: (text, color) => {
		const regEx = /\[\[(.+?)\,(\s+)?(.+?)\]\]/i;
		const colors = {
			reset: "\x1b[0m",
			fgBlack: "\x1b[30m",
			fgRed: "\x1b[31m",
			fgGreen: "\x1b[32m",
			fgOrange: "\x1b[33m",
			fgBlue: "\x1b[34m",
			fgMagenta: "\x1b[35m",
			fgCyan: "\x1b[36m",
			fgYellow: "\x1b[93m",
			fgWhite: "\x1b[37m",
			bgBlack: "\x1b[40m",
			bgRed: "\x1b[41m",
			bgGreen: "\x1b[42m",
			bgOrange: "\x1b[43m",
			bgBlue: "\x1b[44m",
			bgMagenta: "\x1b[45m",
			bgCyan: "\x1b[46m",
			bgWhite: "\x1b[47m",
			bgGray: "\x1b[100m",
			underscore: "\x1b[4m"
		}

		try {
			text.match(new RegExp(regEx, 'gi')).forEach((object, key) => {
				object = object.match(regEx);
				text = text.replace(object[0], colors[object[1]] + object[3] + colors.reset);
			});
		} catch (err) { }

		if (color) {
			if (colors[color])
				console.log(colors[color] + text + colors.reset);
			else
				console.log(text);
		} else console.log(text);
	},

	/*
	*	Gets current IP-adress(es)
	*
	*	@param {Objext} os
	*		Native NodeJS os module
	*	@return {Array}
	*/
	getLocalIP: os => {
		const ifaces = os.networkInterfaces();
		const ips = [];

		Object.keys(ifaces).forEach(ifname => {
			ifaces[ifname].forEach(iface => {
				if (iface.internal || iface.family === 'IPv6')
					return;

				ips.push(iface.address);
			});
		});

		return ips;
	},

	/*
	*	Responsible for checking if https arguments are present
	*/
	httpsArgs: () => {
		for (let i = 0; i < process.argv.length; i++) {
			const object = process.argv[i];

			if (object.indexOf('--https=') > -1) {
				const index = object.trim().match(/(--https=)\{(.+)\}/);

				if (index) {
					if (index[2]) {
						if (index[2].length > 0) {
							utils.safeJSONParse(`{${index[2]}}`).then(JSONData => {
								if (!('key' in JSONData && 'cert' in JSONData))
									console.wrn('Found https argument, but the given JSON value doesn\'t contain one or both of the required arguments (key, cert). Starting with default settings...');
								else {
									if (!(fs.existsSync(JSONData.key) && fs.existsSync(JSONData.cert)))
										console.wrn('Found https argument, but the given cert or key path(s) don\'t exist. Starting with default settings...');
									else {
										utils.colorLog('Found https argument. Starting server in https mode!', 'bgGreen');
										return JSONData;
									}
								}
							}).catch(() => {
								console.wrn('Found https argument, but couln\'t parse the given JSON value. Starting with default settings...');
							});
						}
					}
				} else console.wrn('Found https argument, but couln\'t parse the given value. Starting with default settings...');

				return;
			} else if (object.indexOf('--https-config=') > -1) {
				const index = object.trim().match(/(--https-config=)(.+)/);

				if (index) {
					if (index[2]) {
						if (index[2].length > 0) {
							try {
								if (!fs.existsSync(index[2]))
									console.wrn('Found https argument, but couln\'t parse the given JSON value. Starting with default settings...');
								else {
									utils.safeJSONParse(fs.readFileSync(index[2], 'utf-8')).then(JSONData => {
										if (!('key' in JSONData && 'cert' in JSONData))
											console.wrn('Found https argument, but the given JSON value doesn\'t contain one or both of the required arguments (key, cert). Starting with default settings...');
										else {
											if (!(fs.existsSync(JSONData.key) && fs.existsSync(JSONData.cert)))
												console.wrn('Found https argument, but the given cert or key path(s) don\'t exist. Starting with default settings...');
											else {
												utils.colorLog('Found https argument. Starting server in https mode!', 'bgGreen');
												return JSONData;
											}
										}
									}).catch(() => {
										console.wrn('Found https argument, but the specified file doesn\'t exist. Starting with default settings...');
									});
								}
							} catch (err) {
								console.wrn('Found https argument, but couln\'t parse the given file. Starting with default settings...');
							}
						}
					}
				} else console.wrn('Found https argument, but couln\'t parse the given value. Starting with default settings...');

				return;
			}
		}

		return;
	}
}

// Console.err is a console.error log in red:
console.err = (...args) => console.error("\x1b[31m", ...args, "\x1b[0m");
// Console.wrn is a console.warn log in orange:
console.wrn = (...args) => console.warn("\x1b[33m", ...args, "\x1b[0m");

// Check args
if (process.argv.includes('-h') || process.argv.includes('--help') || process.argv.includes('help')) {
	console.log('Available commands:');
	console.log('');
	console.log("'check-updates':\tChecks for updates against GitHub");
	console.log("'update-json':\t\tUpdate the audio/video library");
	console.log("'rename-file':\t\t(Not tested well!) Rename a file and all occurences in the MusicStream 'databases'");
	console.log('');
	utils.colorLog("You can also run 'npm run update' to update MusicStream!", 'fgGreen');
	process.exit(1);
} else if (process.argv.includes('check-updates')) {
	utils.newVersionAvailable(version).then(newVersion => {
		if (newVersion.greater)
			utils.colorLog(`[[reset, ${utils.logDate()}]] [[fgGreen, No update available.]]\nRunning version: [[fgBlue, ${newVersion.version}]].\nBut this version is greater than the version of latest release on GitHub ([[fgBlue, ${newVersion.githubVersion}]]), maybe you want to get the code from GitHub: [[fgYellow, ${newVersion.url}]].\nDon't forget to update the settings file!\n`, 'fgOrange');
		else if (newVersion.isAvailable == true)
			utils.colorLog(`[[reset, ${utils.logDate()}]] [[fgGreen, A new update is available:]] [[fgBlue, ${newVersion.version}]].\nYou can download it at: [[fgMagenta, ${newVersion.url}]].\nRun 'node update.js' to upgrade to the latest version\n`, 'fgGreen');
		else {
			utils.colorLog(`[[reset, ${utils.logDate()}]] [[fgGreen, No update available.]] Running version: [[fgBlue, ${newVersion.version}]]\n`, 'fgCyan');
			utils.colorLog('[[bgCyan, Changelog]]', 'underscore');
			console.log(newVersion.body);
		}
	}).catch(err => {
		console.wrn('An error occurred when checking for updates:', err);
		startServer();
	});

	return;
} else if (process.argv.includes('update-json')) {
	fileHandler.searchSystem(fs, os, pathModule, utils, settings).then(() => {
		console.log('Successfully updated the JSON file.');
	}).catch(err => {
		console.log('There was an error with updating the JSON:', err);
	});

	return;
} else if (process.argv.includes('rename-file')) {
	if (process.argv[3] && process.argv[4]) {
		const fromFileName = process.argv[3].toString().trim();
		const toFileName = process.argv[4].toString().trim();

		if (fromFileName != toFileName) {
			utils.colorLog(`Tying to renaming '${fromFileName}' to '${toFileName}'`, 'fgCyan');

			fileHandler.getJSON(fs, os, pathModule, utils, settings).then(val => {
				console.log('Got all files. Searching...');

				const songsArr = val.audio.songs.map(val => { return val.fileName });
				const videosArr = val.video.videos.map(val => { return val.fileName });

				if (songsArr.includes(fromFileName))
					handleFound(songsArr, val.audio.playlists, val.audio.songs, fromFileName, toFileName);
				else if (videosArr.includes(fromFileName))
					handleFound(videosArr, null, val.video.videos, fromFileName, toFileName);
				else
					utils.colorLog('File not found in list. Try updating the JSON list by running this file with [[bgGray, update-json]] arg.');
			}).catch(err => {
				utils.colorLog('Error: ' + err, 'fgRed');
			});
		} else utils.colorLog('The filenames are the same', 'fgRed');
	} else if (process.argv[4]) utils.colorLog('No origional name', 'fgRed');
	else if (process.argv[3]) utils.colorLog('No new file name', 'fgRed');
	else utils.colorLog('Bug!!', 'fgRed');

	function handleFound(arr, playlists, valuesArr, fromFileName, toFileName) {
		function renameFile() {
			return new Promise((resolve, reject) => {
				const obj = valuesArr[arr.indexOf(fromFileName)];

				fs.rename(path.join(obj.path, obj.fileName), path.join(obj.path, toFileName), err => {
					if (err)
						reject(err);
					else {
						utils.colorLog(`Successfuly renamed '${fromFileName}' to '${toFileName}'.`, 'fgCyan');

						fileHandler.searchSystem(fs, os, pathModule, utils, settings, true).then(() => {
							resolve();
						}).catch(err => {
							reject(err);
						});
					}
				});
			});
		}

		function replaceInM3UFiles() {
			function handleFile(object, ) {
				return new Promise((resolve, reject) => {
					fs.readFile(object.fullPath, 'utf-8', (err, data) => {
						if (err)
							reject(err);
						else {
							if (data.indexOf(fromFileName) > -1) {
								data = data.replace(new RegExp(fromFileName, 'g'), toFileName);

								fs.writeFile(object.fullPath, data, err => {
									if (err)
										reject(err);
									else {
										console.log(`Renamed '${fromFileName}' to '${toFileName}' in '${object.fileName}'`);
										resolve('Yay');
									}
								});
							}
						}
					});
				});
			}

			if (playlists) {
				const promises = [];

				playlists.forEach((object, key) => {
					promises.push(handleFile(object, key));
				});

				return Promise.all(promises);
			} else return Promise.resolve();
		}

		async function renameInPlaylistFile() {
			const data = await utils.safeJSONParse(await fs.promises.readFile('./playlists.json', 'utf-8'));

			for (key in data) {
				if (key == settings.mostListenedPlaylistName.val) {
					for (val in data[key]) {
						if (val == fromFileName) {
							console.log('Found in \'' + key + '\'');

							data[key][toFileName] = data[key][fromFileName];
							delete data[key][fromFileName];
						}
					}
				} else {
					data[key].forEach((object, indx) => {
						if (object == fromFileName) {
							console.log('Found in \'' + key + '\'');
							data[key].splice(indx, 1, toFileName);
						}
					});
				}
			}

			const returnVal = await fs.promises.writeFile('./playlists.json', JSON.stringify(data));
			console.log(`'${fromFileName}' renamed to '${toFileName}' in all playlists (except the .m3u files).`);
			return returnVal;
		}

		Promise.all([renameFile(), replaceInM3UFiles(), renameInPlaylistFile()]).then(() => {
			utils.colorLog('Done!', 'fgGreen');
		}).catch(err => {
			utils.colorLog('Error: ' + err, 'fgRed');
		});
	}

	return;
}

utils.colorLog(new Date() + ' [[fgGreen, Starting MusicStream]]');
if (settings.checkForUpdateOnStart.val == true) {
	utils.newVersionAvailable(version).then(newVersion => {
		if (newVersion.greater) {
			utils.colorLog(`[[reset, ${utils.logDate()}]] [[fgGreen, No update available.]]\nRunning version: [[fgBlue, ${newVersion.version}]].\nBut this version is greater than the version of latest release on GitHub ([[fgBlue, ${newVersion.githubVersion}]]), maybe you want to get the code from GitHub: [[fgYellow, ${newVersion.url}]].\nDon't forget to update the settings file!\n`, 'fgOrange');
			startServer();
		} else if (newVersion.isAvailable == true) {
			utils.colorLog(`[[reset, ${utils.logDate()}]] [[fgGreen, A new update is available:]] [[fgBlue, ${newVersion.version}]].\nYou can download it at: [[fgMagenta, ${newVersion.url}]].\nRun 'node update.js' to upgrade to the latest version\n`, 'fgGreen');
		} else {
			utils.colorLog(`[[reset, ${utils.logDate()}]] [[fgGreen, No update available.]] Running version: [[fgBlue, ${newVersion.version}]]\n`, 'fgCyan');
			utils.colorLog('[[bgCyan, Changelog]]', 'underscore');
			console.log(newVersion.body);
			startServer();
		}
	}).catch(err => {
		console.wrn('An error occurred when checking for updates: ' + err + '. Starting server...');
		startServer();
	});
} else startServer();