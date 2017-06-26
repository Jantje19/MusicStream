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

		app.get('*/data/', (request, response) => {
			const url = request.url;
			console.log('Got a request for ' + url);

			fileHandler.getJSON(fs, os, audioFileExtentions, videoFileExtentions, utils).then(json => {
				const songs = [];
				const videos = [];

				json.audio.songs.forEach((object, key) => songs.push(object.fileName));
				json.video.videos.forEach((object, key) => videos.push(object.fileName));

				getPlaylists = (json, fs) => {
					return Promise.all([new Promise((resolve, reject) => {
						const playlists = [];

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
				.then(playlists => response.send({audio: {songs: songs, playlists: playlists[0].concat(playlists[1])}, video: {videos: videos}}))
				.catch(err => response.send({error: "Something went wrong", info: "Either getting the songs or getting the playlists or both went wrong"}));
			}).catch(err => {
				console.error('There was an error with getting the info', err);
				response.send({error: "There was an error with getting the info", info: err});
			});
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

		// app.post('/ytdl*', (request, response) => {
		// 	let body = '';

		// 	request.on('data', data => {
		// 		body += data;

		// 		if (body.length > 1e6) {
		// 			request.send({success: false, err: 'The amount of data is to much', info: 'The connection was destroyed because the amount of data passed is to much'});
		// 			request.connection.destroy();
		// 		}
		// 	});

		// 	request.on('end', () => {
		// 		const json = JSON.parse(body);

		// 		const url = request.url;
		// 		console.log('Got a request for ' + url);

		// 		if (json.url && json.type) {
		// 			let video, info;
		// 			let options = {};
		// 			// Let user specify video or audio // {filter: 'audioonly'}
		// 			// Let user specify fileName, but default to info evt title
		// 			// Let user specify begin time
		// 			// Look at this: https://github.com/jpweeks/ytdl-audio/blob/master/index.js

		// 			if (json.type != 'audio' && json.type != 'video') {sendError('Type not correct'); return;}
		// 			if (json.url.indexOf('youtube.com') < 0 && json.url.indexOf('youtu.be') < 0) {sendError('Invalid url'); return;}
		// 			if (json.beginTime) options.begin = json.beginTime;
		// 			if (json.type == 'video') {options.filter = format => { return format.container === 'mp4'; }}
		// 			else if (json.type =='audio') options.filter = 'audioonly';

		// 			video = ytdl(json.url, { filter: format => { return format.container === 'mp4'; }});
		// 			video.pipe(fs.createWriteStream(os.homedir() + '/Videos/' + json.fileName));
		// 			video.on('info', info => {
		// 				info = info;
		// 			});

		// 			video.on('progress', (chunkLength, downloaded, total) => {
		// 				process.stdout.cursorTo(0);
		// 				process.stdout.clearLine(1);
		// 				process.stdout.write("DOWNLOADING: " + (downloaded / total * 100).toFixed(2) + '% ');
		// 			});

		// 			video.on('end', () => {
		// 				let fileName;
		// 				process.stdout.write('\n');

		// 				if (json.fileName) fileName = json.fileName;
		// 				else fileName = info.title.replace('"', '\\"') + '.mp4';

		// 				if (json.type == 'audio') {
		// 					const writer = require('fluent-ffmpeg')(reader)
		// 					.format('mp3')
		// 					.audioBitrate(128);

		// 					// if (args.seek) writer.seekInput(formatTime(args.seek));
		// 					// if (args.duration) writer.duration(args.duration);

		// 					// writer.output(process.stdout).run();
		// 					writer.output(os.homedir() + '/Music/' + fileName).run();
		// 					writer.on('finish', done);
		// 				} else if (json.type == 'video') {
		// 					const stream = video.pipe(fs.createWriteStream(os.homedir() + '/Videos/' + fileName));
		// 					console.log(os.homedir() + '/Videos/' + fileName);
		// 					request.pipe(stream);
		// 					stream.on('finish', done);
		// 					stream.on('error', sendError);
		// 				}

		// 				function done() {
		// 					let path;

		// 					if (json.type == 'video') path = os.homedir() + '/Videos/' + fileName;
		// 					else if (json.type == 'audio') path = os.homedir() + '/Music/' + fileName;

		// 					fs.exists(path, exists => {
		// 						if (exists) {
		// 							console.log(fileName + ' downloaded');
		// 							fileHandler.searchSystem(fs, os, audioFileExtentions, videoFileExtentions, utils).then(json => {
		// 								response.send({success: true, fileName: fileName, jsonUpdated: true});
		// 							}).catch(err => response.send({success: true, fileName: fileName, jsonUpdated: false}));
		// 						} else sendError('File does not exist. This is a weird problem... You should investigate.');
		// 					});
		// 				}
		// 			});

		// 			video.on('error', sendError);
		// 		}
		// 	});
		//
		// 	const sendError = err => {
		// 		try {response.send({success: false, error: err}); }
		// 		catch (err) {}
		// 	}
		// });

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