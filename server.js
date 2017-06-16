module.exports = {
	start: function(dirname, fileHandler, fs, os, audioFileExtentions, videoFileExtentions, utils, querystring, id3, mostListenedPlaylistName) {
		const express = require('express');
		const app = express();
		const port = 8000;

		// Data request
		app.get('/data/', (request, response) => {
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

		require('./serverAudioHandler.js').start(app, dirname);
		require('./serverVideoHandler.js').start(app, dirname);

		app.use(express.static(dirname));
		app.listen(port.toString());
		console.log('Server is running on port ' + port);
	}
}