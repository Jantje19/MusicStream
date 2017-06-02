module.exports = {
	start: function(dirname, fileHandler, fs, os, fileExtentions, utils, querystring) {
		const express = require('express');

		const app = express();

		const port = 8000;

		app.get('/data/', (request, response) => {
			const url = request.url;

			console.log('Got a request for ' + url);

			fileHandler.getJSON(fs, os, fileExtentions, utils).then(json => {
				const songs = [];

				json.songs.forEach((object, key) => {
					songs.push(object.fileName);
				});

				getPlaylists = (json, fs) => {
					return new Promise((resolve, reject) => {
						const playlists = [];

						json.playlists.forEach((object, key) => {
							fileHandler.readPlayList(fs, object.path + object.fileName, json.songs).then(songsArr => {
								if (songsArr.length > 0) playlists.push(object.fileName);
								if (key == json.playlists.length - 1) resolve(playlists);
							}).catch(err => reject(err));
						});
					});
				}

				getPlaylists(json, fs).then(playlists => {
					console.log('KAA', playlists);
					if (playlists.length > 0) response.send({songs: songs, playlists: playlists});
					else response.send({songs: songs, playlists: []});
				}).catch(err => {
					console.error(err);
				});
			}).catch(err => {
				console.error('There was an error with getting the info', err);
				response.send({error: "There was an error with getting the info", info: err});
			});
		});

		app.get('/playlist/*', (request, response) => {
			const url = querystring.unescape(request.url);

			console.log('Got a request for ' + url);

			if (!url.endsWith('/')) {
				fileHandler.getJSON(fs, os, fileExtentions, utils).then(json => {
					const playlistName = url.match(/(.+)\/(.+)$/)[2].trim();
					const inArray = findPlaylist(json.playlists, playlistName);

					if (inArray.val == true) {
						const playlist = json.playlists[inArray.index];

						fileHandler.readPlayList(fs, playlist.path + playlist.fileName, json.songs).then(songsArr => {
							response.send({songs: songsArr});
						}).catch(err => {
							console.log('There was an error with reading the playlist', err);
							response.send({error: 'There was an error with reading the playlist', info: err});
						});
					} else response.send({error: `The song '${playlistName}' was not found`, info: "The cached JSON file had no reference to this file"});
				}).catch(err => {
					console.error('There was an error with getting the JSON file', err);
					response.send({error: "There was an error with getting the JSON file", info: err});
				});

				function findPlaylist(playlists, name) {
					for (let i = 0; i < playlists.length; i++) {
						if (playlists[i].fileName == name) return {val: true, index: i};
					}

					return {val: false, index: -1};
				}
			} else {
				response.send({"error": "No playlist found"});
			}
		});

		app.get('/song/*', (request, response) => {
			const url = querystring.unescape(request.url);

			console.log('Got a request for ' + url);

			if (!url.endsWith('/')) {
				fileHandler.getJSON(fs, os, fileExtentions, utils).then(json => {
					const songName = url.match(/(.+)\/(.+)$/)[2].trim();
					const inArray = findSong(json.songs, songName);

					if (inArray.val == true) {
						const song = json.songs[inArray.index];
						response.sendFile(song.path + song.fileName);
					} else response.send({error: `The song '${songName}' was not found`, info: "The cached JSON file had no reference to this file"});
				}).catch(err => {
					console.error('There was an error with getting the song', err);
					response.send({error: "There was an error with getting the song", info: err});
				});
			} else {
				response.send({"error": "No song found"});
			}

			function findSong(songs, songName) {
				for (let i = 0; i < songs.length; i++) {
					if (songs[i].fileName == songName) return {val: true, index: i};
				}

				return {val: false, index: -1};
			}
		});

		app.get('/updateJSON/', (request, response) => {
			console.log('Got a request for ' + request.url);

			fileHandler.searchSystem(fs, os, fileExtentions, utils).then(json => {
				// json.playlists.forEach((object, key) => {
				// 	console.log(fileHandler.readPlaylist(object.path + object.file));
				// });

				response.send('JSON updated successfully');
			}).catch(err => {
				console.log(err);
				response.send({error: "There was an error with updating the playlist", info: err});
			});
		});

		app.get('/', (request, response) => {
			const url = request.url;

			console.log('Got a request for ' + url);

			response.sendFile(dirname + url);
		});

		app.use(express.static(dirname));

		app.listen(port.toString());

		console.log('Server is running on port ' + port);
	}
}