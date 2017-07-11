module.exports = {
	start: function(dirname, fileHandler, fs, os, audioFileExtentions, videoFileExtentions, utils, querystring, id3, mostListenedPlaylistName, ytdl) {
		const express = require('express');
		const app = express();
		const port = 8000;

		// Data request
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
			fileHandler.getJSON(fs, os, audioFileExtentions, videoFileExtentions, utils).then(json => {
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
					if (url.toLowerCase().indexOf('sort=oldest') > -1) {
						songs.reverse();
						videos.reverse();
						playlists.reverse();
					}

					response.send({audio: {songs: songs, playlists: playlists}, video: {videos: videos}});
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

			fileHandler.searchSystem(fs, os, audioFileExtentions, videoFileExtentions, utils).then(json => {
				// json.audio.playlists.forEach((object, key) => {
				// 	console.log(fileHandler.readPlaylist(object.path + object.file));
				// });

				response.send('JSON updated successfully');
			}).catch(err => {
				console.log(err);
				response.send({error: "There was an error with updating the playlist", info: err});
			});
		});

		app.get('/getSettings', (request, response) => {
			const url = querystring.unescape(request.url);

			console.log('Got a request for ' + url);

			fileHandler.getSettings(fs).then(json => {
				response.send(json);
			}).catch(err => {
				console.log('There was an error with getting the JSON file', err);
				response.send({error: 'There was an error with getting the JSON file', info: err});
			});
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

			// response.send({"success":true, "info": {"keywords":["techno","chicken","10","hours","loop","kiptokren","funny","dance","disco","music","laser","lights","red","bluepoultry","bok","song","yt:crop=16:9"], "view_count":"1297674", "author": {"id":"UCZDLYzePJ7YFda3b_KjpWoQ", "name":"Kipper", "avatar":"https://yt3.ggpht.com/-oQaJt0ET6zs/AAAAAAAAAAI/AAAAAAAAAAA/vUf0tpkdj20/s88-c-k-no-mo-rj-c0xffffff/photo.jpg", "user":"kiptokren", "channel_url":"https://www.youtube.com/channel/UCZDLYzePJ7YFda3b_KjpWoQ","user_url":"https://www.youtube.com/user/kiptokren"}, "thumbnail_url":"https://i.ytimg.com/vi/gLmcGkvJ-e0/default.jpg", "title":"Techno Chicken [10 hours]", "description":"Song made by Oli Chang.\n\nOriginal: http://www.youtube.com/watch?v=p_2_EJ..."} });
			// return;

			if (id.length == 11) {
				try {
					ytdl.getInfo(id, (err, info) => {
						// For some weird JS reason the type of the parsed info is an object, but the prototype does not work...
						info = JSON.parse(JSON.stringify(info));
						const allowed = ['keywords', 'view_count', 'author', 'title', 'thubnail_url', 'description', 'thumbnail_url'];

						Object.prototype.filter = function(arr) {
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
					try {response.send({success: false, error: err, jsonUpdated: false, addedTags: false})}
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
									if (json.tags) {
										console.log(json.tags);
										console.log("--------");
										console.log(id3.write(json.tags, path));

										if (id3.write(json.tags, path)) {
											fileHandler.searchSystem(fs, os, audioFileExtentions, videoFileExtentions, utils).then(json => {
												response.send({success: true, fileName: json.fileName, jsonUpdated: true, addedTags: true});
											}).catch(err => response.send({success: true, fileName: json.fileName, jsonUpdated: false, addedTags: true}));
										} else response.send({success: true, fileName: json.fileName, jsonUpdated: false, addedTags: false});
									} else response.send({success: true, fileName: json.fileName, jsonUpdated: false, addedTags: false});
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

		require('./serverVideoHandler.js').start(app, dirname, fileHandler, fs, os, audioFileExtentions, videoFileExtentions, utils, querystring);
		require('./serverAudioHandler.js').start(app, dirname, fileHandler, fs, os, audioFileExtentions, videoFileExtentions, utils, querystring, id3, mostListenedPlaylistName);

		app.get('/*', (request, response) => {
			let url = request.url;
			if (url.length > 1) console.log('Got a request for ' + url);
			if (url.indexOf('/videos') > -1) response.sendFile(dirname + 'Video/' + url.replace('/videos/', ''));
			else if (url.indexOf('/') > -1) response.sendFile(dirname + 'Audio/' + url);
		});

		app.use(express.static(dirname));
		app.listen(port.toString());
		console.log('Server is running on port ' + port);
	}
}