module.exports = {
	start: function(dirname, fileHandler, fs, os, settings, utils, querystring, id3, ytdl) {
		const express = require('express');
		const app = express();
		const port = settings.port.val;

		app.get('*/all.css', (request, response) => {
			response.sendFile(dirname + 'all.css');
		});

		app.get('*/Assets/*', (request, response) => {
			response.sendFile(dirname + request.url.replace('videos/', ''));
		});

		app.get('*/data/*', (request, response) => {
			let sort = false;
			const url = request.url;
			console.log('Got a request for ' + url);

			if (url.toLowerCase().indexOf('sort=') > -1) sort = true;
			fileHandler.getJSON(fs, os, settings.audioFileExtensions.val, settings.videoFileExtensions.val, utils).then(json => {
				const songs = [];
				const videos = [];

				if (sort) {
					json.audio.songs.sort(sortFunc);
					json.video.videos.sort(sortFunc);
					json.audio.songs.forEach((object, key) => songs.push(object.fileName));
					json.video.videos.forEach((object, key) => videos.push(object.fileName));
				} else {
					json.audio.songs.forEach((object, key) => songs.push(object.fileName));
					json.video.videos.forEach((object, key) => videos.push(object.fileName));
				}

				getPlaylists = (json, fs) => {
					return Promise.all([new Promise((resolve, reject) => {
						const playlists = [];

						if (sort) playlists.sort(sortFunc);
						json.audio.playlists.forEach((object, key) => {
							fileHandler.readPlayList(fs, object.path + object.fileName, json.audio.songs).then(songsArr => {
								if (songsArr.length > 0) playlists.push(object.fileName);
								if (key == json.audio.playlists.length - 1) resolve(playlists);
							}).catch(err => reject(err));
						});
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

				getPlaylists(json, fs)
				.then(playlists => {
					function flatten(arr) {
						return Array.prototype.concat.apply([], arr);
					}

					playlists = flatten(playlists);
					// If oldest just reverse :P
					if (url.toLowerCase().indexOf('sort=oldest') > -1) {
						songs.reverse();
						videos.reverse();
						playlists.reverse();
					}

					response.send({audio: {songs: songs.filter(val => {return !(settings.ignoredAudioFiles.val.includes(val))}), playlists: playlists}, video: {videos: videos.filter(val => {return !(settings.ignoredVideoFiles.val.includes(val))})}});
				}).catch(err => response.send({error: "Something went wrong", info: "Either getting the songs or getting the playlists or both went wrong"}));
			}).catch(err => {
				console.error('There was an error with getting the info', err);
				response.send({error: "There was an error with getting the info", info: err});
			});

			const sortFunc = (a, b) => {
				const dateA = new Date(a.lastChanged);
				const dateB = new Date(b.lastChanged);
				return dateB - dateA;
			}
		});

		app.get('/updateJSON/', (request, response) => {
			console.log('Got a request for ' + request.url);

			fileHandler.searchSystem(fs, os, settings.audioFileExtensions.val, settings.videoFileExtensions.val, utils).then(json => {
				response.send({success: true});
			}).catch(err => {
				console.log(err);
				response.send({success: false, error: "There was an error with updating the JSON", info: err});
			});
		});

		app.get('/help/', (request, response) => {
			const url = querystring.unescape(request.url);
			console.log('Got a request for ' + url);
			response.sendFile(dirname + 'help.html');
		});

		app.get('/settings/', (request, response) => {
			const url = querystring.unescape(request.url);
			console.log('Got a request for ' + url);
			response.sendFile(dirname + 'settings.html');
		});

		app.get('/getSettings', (request, response) => {
			const url = querystring.unescape(request.url);
			console.log('Got a request for ' + url);
			response.send(settings);
		});

		app.get('/downloadYoutube*', (request, response) => {
			const url = querystring.unescape(request.url);

			console.log('Got a request for ' + url);
			response.sendFile(dirname + 'downloadYoutube.html');
		});

		app.get('/ytdl/*', (request, response) => {
			const url = querystring.unescape(request.url);
			const arr = url.split('/');
			const id = arr[arr.length - 1];
			console.log('Got a request for ' + url);

			if (id.length == 11) {
				try {
					ytdl.getInfo(id, (err, info) => {
						// For some weird JS reason the type of the parsed info is an object, but the prototype does not work...
						info = JSON.parse(JSON.stringify(info));
						// You can edit this
						const allowed = ['keywords', 'view_count', 'author', 'title', 'thubnail_url', 'description', 'thumbnail_url'];

						Object.prototype.filter = function(arr) {
							// Check if it is a JSON Object
							if (this.constructor === {}.constructor) {
								const newObj = {};
								for (key in this) {
									if (arr.includes(key)) newObj[key] = this[key];
								}

								return newObj;
							} else this;
						}

						if (err) response.send({success: false, error: 'No info', info: err});
						else response.send({success: true, info: info.filter(allowed)});
					});
				} catch (err) {response.send({success: false, error: 'Something went wrong', info: err})};
			} else response.send({success: false, error: 'No valid video id', info: 'The video id supplied cannot be from a youtube video'});
		});

		app.post('/ytdl*', (request, response) => {
			let body = '';

			const url = querystring.unescape(request.url);
			console.log('Got a POST request for ' + url);

			request.on('data', data => {
				body += data;

				if (body.length > 1e6) {
					request.send({success: false, err: 'The amount of data is to much', info: 'The connection was destroyed because the amount of data passed is to much'});
					request.connection.destroy();
				}
			});

			request.on('end', () => {
				let json;

				const sendError = err => {
					try {response.send({success: false, error: err, jsonUpdated: false})}
					catch (err) {}
				}

				try {
					json = JSON.parse(body);
				} catch (err) {
					sendError(err);
					return;
				}

				if (json) {
					if (json.url && json.fileName) {
						const options = {};
						const ffmpeg = require('fluent-ffmpeg');
						const path = os.homedir() + '/Music/' + json.fileName + '.mp3';

						if (json.url.indexOf('youtube.com') < 0 && json.url.indexOf('youtu.be') < 0) {sendError('Invalid url'); return;}
						if (json.beginTime) options.begin = json.beginTime;

						options.filter = 'audioonly';

						const video = ytdl(json.url, options);
						const writer = ffmpeg(video)
						.format('mp3')
						.audioBitrate(128);

						const args = {
							seek: 0,
							duration: null
						}

						if (args.seek) writer.seekInput(formatTime(args.seek));
						if (args.duration) writer.duration(args.duration);

						video.on('progress', (chunkLength, downloaded, total) => {
							process.stdout.cursorTo(0);
							process.stdout.clearLine(1);
							process.stdout.write("DOWNLOADING: " + (downloaded / total * 100).toFixed(2) + '% ');
						});

						video.on('end', () => {
							process.stdout.write('\n');

							fs.exists(path, exists => {
								if (exists) {
									console.log(`'${json.fileName}'` + ' downloaded');

									// Tags
									if (json.tags) id3.write(json.tags, path);

									fileHandler.searchSystem(fs, os, settings.audioFileExtensions.val, settings.videoFileExtensions.val, utils).then(json => {
										response.send({success: true, fileName: json.fileName, jsonUpdated: true});
									}).catch(err => response.send({success: true, fileName: json.fileName, jsonUpdated: false}));
								} else sendError('File does not exist. This is a weird problem... You should investigate.');
							});
						});

						writer.output(path).run();
						video.on('error', err => {console.log(err); sendError(err)});
					} else sendError('Tags not found. Expected url, fileName and tags.');
				} else sendError('No JSON found');
			});
		});

		app.post('/updateSettings', (request, response) => {
			let body = '';

			request.on('data', data => {
				body += data;

				if (body.length > 1e6) {
					request.send({success: false, err: 'The amount of data is to much', info: 'The connection was destroyed because the amount of data passed is to much'});
					request.connection.destroy();
				}
			});

			request.on('end', () => {
				const jsonPath = 'settings.json';
				const url = querystring.unescape(request.url);

				console.log('Got a POST request for ' + url);

				fs.writeFile(__dirname + '/' + jsonPath, body, (err) => {
					if (err) response.send({success: false, error: 'There was an error with creating the settings file', info: err});
					else response.send({success: true});
				});
			});
		});

		require('./serverVideoHandler.js').start(app, dirname, fileHandler, fs, os, settings.audioFileExtensions.val, settings.videoFileExtensions.val, utils, querystring);
		require('./serverAudioHandler.js').start(app, dirname, fileHandler, fs, os, settings.audioFileExtensions.val, settings.videoFileExtensions.val, utils, querystring, id3, settings.mostListenedPlaylistName.val);

		// Just handle the rest
		app.get('/*', (request, response) => {
			let url = request.url;
			if (url.length > 1) console.log('Got a request for ' + url);
			if (url.indexOf('/videos') > -1) utils.sendFile(fs, dirname + 'Video/' + url.replace('/videos/', ''), response);
			else if (url.indexOf('/') > -1) utils.sendFile(fs, dirname + 'Audio/' + url, response);
		});

		app.use(express.static(dirname));
		app.listen(port.toString());
		console.log('Server is running on port ' + port);
	}
}