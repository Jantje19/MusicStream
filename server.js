module.exports = {
	start: function(dirname, fileHandler, fs, os, audioFileExtentions, videoFileExtentions, utils, querystring, id3, mostListenedPlaylistName) {
		const express = require('express');
		const app = express();
		const port = 8000;

		// Data request
		app.get('*/header.css', (request, response) => {
			response.sendFile(dirname + 'header.css');
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

		app.post('/updateSettings', (request, response) => {
			let body = '';

			request.on('data', data => {
				body += data;

				if (body.length > 1e6) {
					request.send({success: false, err: 'The amount of data is to high', info: 'The connection was destroyed because the amount of data passed is to much'});
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
		require('./serverAudioHandler.js').start(app, dirname, fileHandler, fs, os, audioFileExtentions, videoFileExtentions, utils, querystring, mostListenedPlaylistName);

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