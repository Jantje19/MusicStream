module.exports = {
	start: (app, dirname, fileHandler, fs, os, audioFileExtentions, videoFileExtentions, utils, querystring, mostListenedPlaylistName) => {
		app.get('/playlist/*', (request, response) => {
			const url = querystring.unescape(request.url);

			console.log('Got a request for ' + url);

			if (!url.endsWith('/')) {
				if (url.match(/(.+)\.(\w{2,5})/)) {
					fileHandler.getJSON(fs, os, audioFileExtentions, videoFileExtentions, utils).then(json => {
						const playlistName = url.match(/(.+)\/(.+)$/)[2].trim();
						const inArray = findPlaylist(json.audio.playlists, playlistName);

						if (inArray.val == true) {
							const playlist = json.audio.playlists[inArray.index];

							fileHandler.readPlayList(fs, playlist.path + playlist.fileName, json.audio.songs).then(songsArr => {
								response.send({songs: songsArr});
							}).catch(err => {
								console.log('There was an error with reading the playlist', err);
								response.send({error: 'There was an error with reading the playlist', info: err});
							});
						} else response.send({error: `The playlist '${playlistName}' was not found`, info: "The cached JSON file had no reference to this file"});
					}).catch(err => {
						console.error('There was an error with getting the JSON file', err);
						response.send({error: "There was an error with getting the JSON file", info: err});
					});
				} else {
					fs.exists('./playlists.json', exists => {
						const name = url.match(/(.+)\/(.+)/)[2];

						if (exists) {
							fs.readFile('./playlists.json', 'utf-8', (err, data) => {
								if (err) response.send({error: 'Cannot read the file', info: err});
								else {
									data = JSON.parse(data);

									if (name == mostListenedPlaylistName)
										response.send({songs: utils.sortJSON(data[mostListenedPlaylistName]).map(val => {return val[0]})});
									else response.send({songs: data[name]});
								}
							});
						} else response.send({error: `The playlist '${name}' was not found`, info: "The 'playlists.json' file had no reference to this file"});
					});
				}

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
				fileHandler.getJSON(fs, os, audioFileExtentions, videoFileExtentions, utils).then(json => {
					const songName = url.match(/(.+)\/(.+)$/)[2].trim();
					const inArray = findSong(json.audio.songs, songName);

					if (inArray.val == true) {
						const song = json.audio.songs[inArray.index];
						response.sendFile(song.path + song.fileName);
					} else response.send({error: `The song '${songName}' was not found`, info: "The cached JSON file had no reference to this file"});
				}).catch(err => response.send({error: "There was an error with getting the song", info: err}));
			} else {
				response.send({error: "No song found"});
			}

			function findSong(songs, songName) {
				for (let i = 0; i < songs.length; i++) {
					if (songs[i].fileName == songName) return {val: true, index: i};
				}

				return {val: false, index: -1};
			}
		});

		app.get('/OldBrowsers/*', (request, response) => {
			const url = request.url;

			console.log('Got a request for ' + url + '. HAHA Your browser sucks');

			fileHandler.getJSON(fs, os, audioFileExtentions, videoFileExtentions, utils).then(json => {
				let html = '<script>function playSong(songName) {var elem = document.getElementById("audio"); elem.src = "/song/" + songName; elem.play()}</script><audio id="audio">YOUR BROWSER DOESN\'T SUPPORT THE AUDIO ELEMENT</audio>';

				json.audio.songs.forEach((object, key) => {
					html += `<a onclick="playSong('${object.fileName}')" href="#">${object.fileName}</a><hr>`; // href="/song/${object.fileName}" target="_blank"
				});

				response.send(html);
			}).catch(err => response.status(404).send('Error: ' + err));
		});

		app.post('/updatePlaylist', (request, response) => {
			let body = '';

			request.on('data', data => {
				body += data;

				if (body.length > 1e6) {
					request.send({success: false, err: 'The amount of data is to high', info: 'The connection was destroyed because the amount of data passed is to much'});
					request.connection.destroy();
				}
			});

			request.on('end', () => {
				const url = querystring.unescape(request.url);

				console.log('Got a POST request for ' + url);

				try {body = JSON.parse(body);}
				catch (err) {
					response.send({error: 'Couldn\'t parse to JSON', info: err});
					return;
				}

				fileHandler.updatePlaylist(fs, body, mostListenedPlaylistName).then(data => response.send(data)).catch(err => response.send(err));
			});
		});

		app.post('/updateMostListenedPlaylist', (request, response) => {
			let body = '';

			request.on('data', data => {
				body += data;

				if (body.length > 1e6) {
					request.send({success: false, err: 'The amount of data is to high', info: 'The connection was destroyed because the amount of data passed is to much'});
					request.connection.destroy();
				}
			});

			request.on('end', () => {
				let songs = {};
				const jsonPath = './playlists.json';
				const url = querystring.unescape(request.url);

				console.log('Got a POST request for ' + url);
				fs.exists(jsonPath, exists => {
					if (exists) {
						fs.readFile('./playlists.json', 'utf-8', (err, data) => {

							try {data = JSON.parse(data)} catch (err) {return}
							if (data[mostListenedPlaylistName]) {
								songs = data[mostListenedPlaylistName];

								if (body in songs) songs[body]++;
								else songs[body] = 1;
							} else songs[body] = 1;

							send();
						});
					} else {
						songs[body] = 1;
						send();
					}

					function send() {fileHandler.updatePlaylist(fs, {name: mostListenedPlaylistName, songs: songs}, mostListenedPlaylistName).then(data => response.send({success: true, data: body + ' successfully added to ' + mostListenedPlaylistName})).catch(err => response.send({success: false, data: 'Something happened when tried to add ' + body + ' to ' + mostListenedPlaylistName}));}
				});
			});
		});
	}
}