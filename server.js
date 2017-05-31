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
				const playlists = [];

				json.songs.forEach((object, key) => {
					console.log(object);
					songs.push(object.fileName);
				});

				json.playlists.forEach((object, key) => {
					playlists.push(object.fileName);
				});

				response.send({songs: songs, playlists: playlists});
			}).catch(err => {
				console.error('There was an error with getting the info', err);
				response.send({error: "There was an error with getting the info", info: err});
			});
		})

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