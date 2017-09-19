module.exports = {
	start: function(dirname, fileHandler, fs, os, settings, utils, querystring, id3, ytdl, version, https, URLModule) {
		const express = require('express');
		const app = express();
		const port = settings.port.val;

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
			fileHandler.getJSON(fs, os, settings.audioFileExtensions.val, settings.videoFileExtensions.val, utils).then(json => {
				const songs = [];
				const videos = [];

				if (json.audio.songs.length > 0 || json.video.videos.length > 0) {
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

					getPlaylists(json, fs).then(playlists => {
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

		app.get('/ytdl/*', (request, response) => {
			const url = querystring.unescape(request.url);
			const arr = url.split('/');
			const id = arr[arr.length - 1];
			console.log(utils.logDate() + ' Got a request for ' + url);

			if (id.length == 11) {
				try {
					ytdl.getInfo(id, (err, info) => {
						info = JSON.parse(JSON.stringify(info));
						const allowed = ['keywords', 'view_count', 'author', 'title', 'thubnail_url', 'description', 'thumbnail_url', 'length_seconds'];

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
			console.log(utils.logDate() + ' Got a POST request for ' + url);

			request.on('data', data => {
				body += data;

				if (body.length > 1e6) {
					request.send({success: false, err: 'The amount of data is too much', info: 'The connection was destroyed because the amount of data passed is too much'});
					request.connection.destroy();
				}
			});

			request.on('end', () => {
				let json;

				const sendError = err => {
					try {response.send({success: false, error: err, jsonUpdated: false})}
					catch (err) {}
				}

				const urlOk = url => {
					if (url.indexOf('youtube.com') > 0) {
						if (url.match(/https?:\/\/youtube\.com\/watch\?v\=(([A-Z]|[a-z]|[0-9]|\-|\_){11})$/))
							return true;
						else return false;
					} else if (url.indexOf('youtu.be') > 0) {
						if (url.match(/https?:\/\/youtu\.be\/(([A-Z]|[a-z]|[0-9]|\-|\_){11})$/))
							return true;
						else return false;
					} else return false;
				}

				try {
					json = JSON.parse(body);
				} catch (err) {
					sendError(err);
					return;
				}

				if (json) {
					if (json.url && json.fileName && json.type) {
						// Slashes don't work in paths
						json.fileName = json.fileName.replace('\/', '\\');

						const options = {};
						const ffmpeg = require('fluent-ffmpeg');

						if (!urlOk(json.url)) {sendError('Invalid url'); return;}
						if (json.beginTime) options.begin = json.beginTime;
						if (json.endTime) options.end = json.endTime;

						if (json.type == 'video') {
							const path = os.homedir() + '/Videos/' + json.fileName + '.mp4';
							const video = ytdl(json.url, { filter: function(format) { return format.container === 'mp4'; } });
							const args = {
								seek: json.startTime,
								duration: json.endTime
							}

							video.pipe(fs.createWriteStream(path));
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

										fileHandler.searchSystem(fs, os, settings.audioFileExtensions.val, settings.videoFileExtensions.val, utils).then(() => {
											response.send({success: true, fileName: json.fileName + '.mp4', jsonUpdated: true});
										}).catch(err => response.send({success: true, fileName: json.fileName, jsonUpdated: false}));
									} else sendError('File does not exist. This is a weird problem... You should investigate.');
								});
							});

							video.on('error', err => {sendError(err)});
						} else if (json.type == 'audio') {
							const path = os.homedir() + '/Music/' + json.fileName + '.mp3';

							options.filter = 'audioonly';

							const video = ytdl(json.url, options);
							const writer = ffmpeg(video)
							.format('mp3')
							.audioBitrate(128);

							const args = {
								seek: json.startTime,
								duration: json.endTime
							}

							if (args.seek) writer.seekInput(/*formatTime(*/args.seek/*)*/);
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
										fileHandler.searchSystem(fs, os, settings.audioFileExtensions.val, settings.videoFileExtensions.val, utils).then(() => {
											response.send({success: true, fileName: json.fileName + '.mp3', jsonUpdated: true});
										}).catch(err => response.send({success: true, fileName: json.fileName, jsonUpdated: false}));
									} else sendError("File does not exist. This is a weird problem... You should investigate.");
								});
							});
						} else sendError('Type not correct');
					} else sendError('Tags not found. Expected url, fileName and tags.');
				} else sendError('No JSON found');
			});
		});

app.post('/tags*', (request, response) => {
	let body = '';

	const url = querystring.unescape(request.url);
	console.log(utils.logDate() + ' Got a POST request for ' + url);

	request.on('data', data => {
		body += data;

		if (body.length > 1e6) {
			request.send({success: false, err: 'The amount of data is to much', info: 'The connection was destroyed because the amount of data passed is to much'});
			request.connection.destroy();
			return;
		}
	});

	request.on('end', () => {
		let json;

		try {
			json = JSON.parse(body);
		} catch (err) {
			response.send({success: false, info: err});
			return;
		}

		if (json.tags && json.songName) {
			fileHandler.getJSON(fs, os, settings.audioFileExtensions.val, settings.videoFileExtensions.val, utils).then(songs => {
				function findSong(array, songName) {
					for (let i = 0; i < array.length; i++) {
						if (array[i].fileName == songName) return array[i];
					}
				}

				function getImage(url) {
					return new Promise((resolve, reject) => {
						const http = require('http');
						Stream = require('stream').Transform;

						url = url.replace('https', 'http');

						http.request(url, response => {
							const data = new Stream();

							response.on('data', chunk => {
								data.push(chunk);
							});

							response.on('error', reject);

							response.on('end', function() {
								const buffer = data.read();

								if (buffer instanceof Buffer) resolve(buffer);
								else reject('Not a buffer');
							});
						}).end();
					});
				}

				function done() {
					if (id3.write(json.tags, findSong(songs.audio.songs, json.songName).path + json.songName)) response.send({success: true});
					else response.send({success: false, info: 'Something went wrong with writing the tags'});
				}

				if (json.tags.delete) {
					if (id3.removeTags(findSong(songs.audio.songs, json.songName).path + json.songName))
						response.send({success: true});
					else response.send({success: false, info: "Tags not deleted"});
				} else {
					if (json.tags.image) {
						getImage(json.tags.image).then(imageBuffer => {
							json.tags.image = imageBuffer;
							done();
						}).catch(err => {console.err(err); response.send({success: false, info: err})});
					} else done();
				}
			}).catch(err => {console.err(err); response.send({success: false, info: err})});
		} else response.send({success: false, info: 'The required tags (tags, songName) are not found.'});
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
		const jsonPath = './settings.js';
		const url = querystring.unescape(request.url);

		console.log(utils.logDate() + ' Got a POST request for ' + url);

		try {
			body = JSON.parse(body);

					// Copy the settings
					data = JSON.parse(JSON.stringify(settings));

					for (key in body) {
						data[key].val = body[key];
					}

					fs.writeFile(jsonPath, 'module.exports = ' + JSON.stringify(data), err => {
						if (err) response.send({success: false, info: err});
						else response.send({success: true});
					});
				} catch (err) {response.send({success: false, info: err})}
			});
});

require('./serverVideoHandler.js').start(app, dirname, fileHandler, fs, os, settings, utils, querystring);
require('./serverAudioHandler.js').start(app, dirname, fileHandler, fs, os, settings, utils, querystring, id3, https, URLModule);

		// Just handle the rest
		app.get('/*', (request, response) => {
			let url = request.url.replace(/\?(\w+)=(.+)/, '');
			if (url.length > 1) console.log(utils.logDate() + ' Got a request for ' + url);
			if (url.indexOf('/videos') > -1) utils.sendFile(fs, dirname + 'Video/' + url.replace('/videos/', ''), response);
			else if (url.indexOf('/') > -1) utils.sendFile(fs, dirname + 'Audio/' + url, response);
		});

		app.use(express.static(dirname));
		app.listen(port.toString());

		const ips = utils.getLocalIP(os);

		if (ips.length > 1) {
			ips.forEach((object, key) => {
				utils.colorLog(`${utils.logDate()} Server is running on: [[fgGreen, ${object}:${port}]]`, 'reset');
			});
		} else utils.colorLog(`${utils.logDate()} Server is running on: [[fgGreen, ${ips[0]}:${port}]]`, 'reset');
	}
}