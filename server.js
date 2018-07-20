module.exports = {
	start: function(dirname, fileHandler, fs, os, settings, utils, querystring, id3, ytdl, version, https, URLModule, serverPlugins, hijackRequestPlugins) {
		const compression = require('compression');
		const express = require('express');
		const app = express();

		// HTTPS Support
		let httpsServer;
		const httpsSupport = utils.httpsArgs();

		if (httpsSupport) {
			const privateKey = fs.readFileSync(httpsSupport.key);
			const certificate = fs.readFileSync(httpsSupport.cert);
			const credentials = {key: privateKey, cert: certificate};

			httpsServer = https.createServer(credentials, app);
		}
		//

		const port = settings.port.val || 8000;
		const ips = utils.getLocalIP(os);

		app.use(compression());
		app.use(express.static(dirname));

		app.get('*favicon.ico*', (request, response) => {
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
			utils.sendFile(fs, dirname + 'all.js', response);
		});

		app.get('*/all.css', (request, response) => {
			utils.sendFile(fs, dirname + 'all.css', response);
		});

		app.get('*/seekbarStyle.css', (request, response) => {
			utils.sendFile(fs, dirname + 'seekbarStyle.css', response);
		});

		app.get('*/Assets/*', (request, response) => {
			utils.sendFile(fs, dirname + request.url.replace('videos/', ''), response);
		});

		app.get('*/favicon.ico', (request, response) => {
			utils.sendFile(fs, dirname + 'Assets/Icons/favicon.ico', response);
		});

		app.get('*/data/*', (request, response) => {
			let sort = false;
			const url = request.url;
			console.log(utils.logDate() + ' Got a request for ' + url);

			if (url.toLowerCase().indexOf('sort=') > -1) sort = true;
			fileHandler.getJSON(fs, os, utils, settings).then(json => {
				const songs = [];
				const videos = {};
				const subtitles = ('subtitles' in json.video) ? json.video.subtitles.map(val => {return val.fileName}) : [];

				const handleVideos = obj => {
					// REVERSE!!

					for (key in obj)
						videos[key] = obj[key].map(val => {return val.fileName}).filter(val => {return !(settings.ignoredVideoFiles.val.includes(val))});
				}

				if (json.audio.songs.length > 0 || Object.keys(json.video.videos).length > 0) {
					if (sort) {
						// Sorting videos
						for (key in json.video.videos)
							json.video.videos[key] = json.video.videos[key].sort(sortFunc);

						json.audio.songs.sort(sortFunc);
						// json.video.videos.sort(sortFunc);
						json.audio.songs.forEach((object, key) => songs.push(object.fileName));
						handleVideos(json.video.videos);
					} else {
						json.audio.songs.forEach((object, key) => songs.push(object.fileName));
						handleVideos(json.video.videos);
					}

					getPlaylists = (json, fs) => {
						return Promise.all([new Promise((resolve, reject) => {
							const playlists = [];

							if (sort)
								playlists.sort(sortFunc);

							if (json.audio.playlists.length > 0) {
								json.audio.playlists.forEach((object, key) => {
									fileHandler.readPlayList(fs, object.path + object.fileName, json.audio.songs).then(songsArr => {
										if (songsArr.length > 0)
											playlists.push(object.fileName);

										if (key == json.audio.playlists.length - 1)
											resolve(playlists);
									}).catch(err => reject(err));
								});
							} else resolve([]);
						}), new Promise((resolve, reject) => {
							fs.exists('./playlists.json', exists => {
								if (exists) {
									fs.readFile('./playlists.json', 'utf-8', (err, data) => {
										if (err) resolve(JSON.parse(data));
										else {
											const arr = [];
											data = JSON.parse(data);

											for (key in data)
												arr.push(key);

											resolve(arr);
										}
									});
								} else resolve([]);
							});
						})
						]);
					}

					getPlaylists(json, fs).then(playlists => {
						function flatten(arr) {
							return Array.prototype.concat.apply([], arr);
						}

						playlists = flatten(playlists);
						// If oldest just reverse :P
						if (url.toLowerCase().indexOf('sort=oldest') > -1) {
							// Reverse videos
							for (key in videos)
								videos[key] = videos[key].reverse();

							songs.reverse();
							playlists.reverse();
						}

						response.send({
							audio: {
								songs: songs.filter(val => {
									return !(settings.ignoredAudioFiles.val.includes(val))
								}),
								playlists: playlists
							},
							video: {
								videos: videos,
								subtitles: subtitles
							}
						});
					}).catch(err => {
						console.err(err);
						response.send({error: "Something went wrong", info: "Either getting the songs or getting the playlists or both went wrong"})
					});
				} else response.send({error: "Not found", info: "There are no media files found on this device."});
			}).catch(err => {
				console.err('There was an error with getting the info', err);
				response.send({error: "There was an error with getting the info", info: err});
			});

			const sortFunc = (a, b) => {
				const dateA = new Date(a.lastChanged);
				const dateB = new Date(b.lastChanged);
				return dateB - dateA;
			}
		});

		app.get('/checkForUpdates/', (request, response) => {
			console.log(utils.logDate() + ' Got a request for ' + request.url);

			utils.newVersionAvailable(version).then(newVersion => {
				response.send({success: true, data: newVersion});
			}).catch(err => response.send({success: false, error: err}));
		});

		app.get('/updateJSON/', (request, response) => {
			console.log(utils.logDate() + ' Got a request for ' + request.url);

			fileHandler.searchSystem(fs, os, utils, settings).then(json => {
				response.send({success: true});
			}).catch(err => {
				console.err(err);
				response.send({success: false, error: "There was an error with updating the JSON", info: err});
			});
		});

		app.get('/help/', (request, response) => {
			const url = querystring.unescape(request.url);
			console.log(utils.logDate() + ' Got a request for ' + url);
			utils.sendFile(fs, dirname + 'help.html', response);
		});

		app.get('/settings/', (request, response) => {
			const url = querystring.unescape(request.url);
			console.log(utils.logDate() + ' Got a request for ' + url);
			utils.sendFile(fs, dirname + 'settings.html', response);
		});

		app.get('/getSettings', (request, response) => {
			const url = querystring.unescape(request.url);
			console.log(utils.logDate() + ' Got a request for ' + url);
			response.send(settings);
		});

		app.get('/downloadYoutube*', (request, response) => {
			const url = querystring.unescape(request.url);

			console.log(utils.logDate() + ' Got a request for ' + url);
			utils.sendFile(fs, dirname + 'downloadYoutube.html', response);
		});

		app.get('/LoadPluginJS/*', (request, response) => {
			const url = querystring.unescape(request.url);
			console.log(utils.logDate() + ' Got a request for ' + url);

			const filePath = url.replace(request.headers.referer, '').replace('/LoadPluginJS/', '');
			utils.sendFile(fs, __dirname + '/Plugins/' + filePath, response);
		});

		app.get('/youtubeData/*', (request, response) => {
			const url = querystring.unescape(request.url);
			const arr = url.split('/');
			const id = arr[arr.length - 1];
			console.log(utils.logDate() + ' Got a request for ' + url);

			if (id.length == 11) {
				try {
					ytdl.getInfo(id, (err, info) => {
						if (err)
							response.send({success: false, error: 'No info found for that video id', info: err});
						else {
							info = JSON.parse(JSON.stringify(info));
							const allowed = ['keywords', 'view_count', 'author', 'title', 'thubnail_url', 'description', 'thumbnail_url', 'length_seconds'];

							Object.prototype.filter = function(arr) {
								if (this.constructor === {}.constructor) {
									const newObj = {};
									for (key in this) {
										if (arr.includes(key))
											newObj[key] = this[key];
									}

									return newObj;
								} else this;
							}

							response.send({success: true, info: info.filter(allowed)});
						}
					});
				} catch (err) {response.send({success: false, error: 'Something went wrong', info: err})};
			} else response.send({success: false, error: 'No valid video id', info: 'The video id supplied cannot be from a youtube video'});
		});

		app.get('/cutFile*', (request, response) => {
			const url = querystring.unescape(request.url);
			const params = querystring.parse(URLModule.parse(url).query);

			if ('filename' in params && ('start' in params || 'end' in params)) {
				fileHandler.getJSON(fs, os, utils, settings).then(json => {
					const index = json.audio.songs.map(val => {
						return val.fileName;
					}).indexOf(params.filename);

					if (index > -1) {
						const file = json.audio.songs[index];
						const ffmpeg = require('fluent-ffmpeg');
						const ffmpegObj = ffmpeg(file.path + file.fileName);

						if ('end' in params) ffmpegObj.setDuration(params.end);
						if ('start' in params) ffmpegObj.setStartTime(params.start);

						ffmpegObj.output(file.path + file.fileName);
						ffmpegObj.on('end', err => {
							if (err)
								response.send({success: false, error: JSON.parse(err)});
							else
								response.send({success: true});
						});

						ffmpegObj.on('error', err => {
							console.log("FFMPEG Error", err);
							response.send({success: false, error: JSON.parse(err)});
						});

						ffmpegObj.run();
					} else response.send({success: false, error: "File not found"});
				});
			} else response.send({success: false, error: "Parameters missing"});
		});

		app.post('/ytdl*', (request, response) => {
			let body = '';

			const url = querystring.unescape(request.url);
			console.log(utils.logDate() + ' Got a POST request for ' + url);

			request.on('data', data => {
				body += data;

				if (body.length > 1e6) {
					response.send({success: false, err: 'The amount of data is too much', info: 'The connection was destroyed because the amount of data passed is too much'});
					request.connection.destroy();
				}
			});

			request.on('end', () => {
				let json;

				const sendData = data => {
					response.send(data);
				}

				const sendError = err => {
					try {
						sendData({
							success: false,
							error: err,
							jsonUpdated: false
						});
					} catch (err) {}
				}

				const urlOk = url => {
					const parsedUrl = URLModule.parse(url);
					const vidId = querystring.parse(parsedUrl.query).v;

					if (parsedUrl.host.replace('www.', '') == 'youtube.com') {
						if (vidId) {
							if (vidId.length == 11)
								return 'https://youtube.com/watch?v=' + vidId;
							else return false;
						} else return false;
					} else return false;
				}

				const handleProgress = (chunkLength, downloaded, total) => {
					try {
						process.stdout.cursorTo(0);
						process.stdout.clearLine(1);
						process.stdout.write("DOWNLOADING: " + (downloaded / total * 100).toFixed(2) + '% ');
					} catch (err) {}
				}

				const handleVideo = (json, ffmpeg) => {
					const path = os.homedir() + '/Videos/' + json.fileName + '.mp4';
					const video = ytdl(json.url, { filter: function(format) { return format.container === 'mp4'; } });

					video.pipe(fs.createWriteStream(path));
					video.on('progress', handleProgress);
					video.on('end', () => {
						process.stdout.write('\n');

						fs.exists(path, exists => {
							if (exists) {
								fileHandler.searchSystem(fs, os, utils, settings).then(() => {
									sendData({success: true, fileName: json.fileName + '.mp4', jsonUpdated: true});
								}).catch(err => sendData({success: true, fileName: json.fileName, jsonUpdated: false}));
							} else sendError("File does not exist. This is a weird problem... You should investigate.");
						});
					});
				}

				const handleAudio = (json, ffmpeg) => {
					const path = os.homedir() + '/Music/' + json.fileName + '.mp3';
					const args = {
						bitrate: 128,
						format: 'mp3',
						seek: json.startTime,
						duration: json.endTime
					}

					const reader = ytdl(json.url, {filter: 'audioonly'});
					const writer = ffmpeg(reader).format(args.format).audioBitrate(args.bitrate);

					if (args.seek) writer.seekInput(args.seek);
					if (args.duration) writer.duration(args.duration);

					reader.on('progress', handleProgress);
					reader.on('end', () => {
						process.stdout.write('\n');

						fs.exists(path, exists => {
							if (exists) {
								fileHandler.searchSystem(fs, os, utils, settings).then(() => {
									sendData({success: true, fileName: json.fileName + '.mp3', jsonUpdated: true});
								}).catch(err => {
									sendData({success: true, fileName: json.fileName, jsonUpdated: false});
								});
							} else sendError("File does not exist. This is a weird problem... You should investigate.");
						});
					});

					reader.on('error', err => {sendError(err)});
					writer.output(path).run();
				}

				try {
					json = JSON.parse(body);
				} catch (err) {
					sendError(err);
					return;
				}

				if (json) {
					if (json.url && json.fileName && json.type) {
						// Sanitize file name
						json.fileName = json.fileName.replace('\/', '\\');
						json.fileName = json.fileName.replace(/[/\\?%*:|"<>]/g, '');

						const options = {};
						const ffmpeg = require('fluent-ffmpeg');

						const checkUrl = urlOk(json.url);
						if (urlOk(json.url))
							json.url = checkUrl;
						else {
							sendError('Invalid url');
							return;
						}

						if (json.beginTime) options.begin = json.beginTime;
						if (json.endTime) options.end = json.endTime;

						if (json.type == 'video')
							handleVideo(json, ffmpeg);
						else if (json.type == 'audio')
							handleAudio(json, ffmpeg);
						else sendError('Type not correct');
					} else sendError('Tags not found. Expected url, fileName and tags.');
				} else sendError('No JSON found');
			});
		});
		//
		app.post('/updateSettings', (request, response) => {
			let body = '';

			request.on('data', data => {
				body += data;

				if (body.length > 1e6) {
					response.send({success: false, err: 'The amount of data is to much', info: 'The connection was destroyed because the amount of data passed is to much'});
					request.connection.destroy();
				}
			});

			request.on('end', () => {
				const jsonPath = './settings.js';
				const url = querystring.unescape(request.url);

				console.log(utils.logDate() + ' Got a POST request for ' + url);

				try {
					body = JSON.parse(body);

					// Copy the settings
					data = JSON.parse(JSON.stringify(settings));

					for (key in body)
						data[key].val = body[key];

					fs.writeFile(jsonPath, 'module.exports = ' + JSON.stringify(data), err => {
						if (err)
							response.send({success: false, info: err});
						else {
							response.send({success: true});
							console.wrn('MusicStream restarting because the settings updated!');
							process.exit(131);
						}
					});
				} catch (err) {
					response.send({success: false, info: err});
				}
			});
		});

		require('./serverVideoHandler.js').start(app, dirname, fileHandler, fs, os, settings, utils, querystring);
		require('./serverAudioHandler.js').start(app, dirname, fileHandler, fs, os, settings, utils, querystring, id3, https, URLModule);

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
							args.forEach((object, key) => {
								app.post(`/${this.pluginName}/${object.name}*`, object.func);
							});
						} else {
							app.post(`/${this.pluginName}/${args.name}*`, args.func);
						}
					}
				}
			}

			serverPlugins.forEach((object, key) => {
				const data = Object.assign({}, availableData);
				const server = new PluginServerHandler(object.folder);

				data.path = `${__dirname}/Plugins/${object.folder}/`;
				object.func(server, imports, data);
			});
		}

		// Just handle the rest
		app.get('*', (request, response) => {
			let url = request.url.replace(/\?(\w+)=(.+)/, '');
			if (url.length > 1)
				console.log(utils.logDate() + ' Got a request for ' + url);

			if (url.indexOf('/videos') > -1)
				utils.sendFile(fs, dirname + 'Video/' + url.replace('/videos/', ''), response);
			else if (url.indexOf('/') > -1)
				utils.sendFile(fs, dirname + 'Audio/' + url, response);
			else
				utils.sendFile(fs, 'THIS NAME DOES_NOT EXIST', response);
		});

		const listenerObject = httpsServer || app;

		listenerObject.listen(port, err => {
			if (err)
				throw err;
			else {
				if (ips.length > 1) {
					ips.forEach((object, key) => {
						utils.colorLog(`${utils.logDate()} Server is running on: [[fgGreen, ${object}:${port}]]`, 'reset');
					});
				} else utils.colorLog(`${utils.logDate()} Server is running on: [[fgGreen, ${ips[0] || 'localhost'}:${port}]]`, 'reset');
			}
		});
	}
}