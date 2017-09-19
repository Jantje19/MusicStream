module.exports = {
	start: (app, dirname, fileHandler, fs, os, settings, utils, querystring, id3, https, URLModule) => {
		app.get('/playlist/*', (request, response) => {
			const url = querystring.unescape(request.url);

			console.log(utils.logDate() + ' Got a request for ' + url);

			if (!url.endsWith('/')) {
				// Check if it has a file extention, otherwise read the playlists.json file
				if (url.match(/(.+)\.(\w{2,5})/)) {
					fileHandler.getJSON(fs, os, settings.audioFileExtensions.val, settings.videoFileExtensions.val, utils).then(json => {
						const playlistName = url.match(/(.+)\/(.+)$/)[2].trim();
						const inArray = findPlaylist(json.audio.playlists, playlistName);

						// Check if the playlist actually exists
						if (inArray.val == true) {
							const playlist = json.audio.playlists[inArray.index];

							// Let fileHandler.js handle this
							fileHandler.readPlayList(fs, playlist.path + playlist.fileName, json.audio.songs).then(songsArr => {
								response.send({songs: songsArr});
							}).catch(err => {
								console.err('There was an error with reading the playlist', err);
								response.send({error: 'There was an error with reading the playlist', info: err});
							});
						} else response.send({error: `The playlist '${playlistName}' was not found`, info: "The cached JSON file had no reference to this file"});
					}).catch(err => {
						console.err('There was an error with getting the JSON file', err);
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

									if (name == settings.mostListenedPlaylistName.val)
										response.send({songs: utils.sortJSON(data[settings.mostListenedPlaylistName.val]).map(val => {return val[0]})});
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

			console.log(utils.logDate() + ' Got a request for ' + url);

			if (!url.endsWith('/')) {
				fileHandler.getJSON(fs, os, settings.audioFileExtensions.val, settings.videoFileExtensions.val, utils).then(json => {
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

		app.get('/songInfo/*', (request, response) => {
			const url = querystring.unescape(request.url);
			console.log(utils.logDate() + ' Got a request for ' + url);

			if (!url.endsWith('/')) {
				fileHandler.getJSON(fs, os, settings.audioFileExtensions.val, settings.videoFileExtensions.val, utils).then(json => {
					const songName = url.match(/(.+)\/(.+)$/)[2].trim();
					const inArray = findSong(json.audio.songs, songName);

					if (inArray.val == true) {
						const song = json.audio.songs[inArray.index];
						fileHandler.getSongInfo(song.path + song.fileName, id3, fs).then(tags => {
							if (tags.image.imageBuffer) {
								// if (tags.image.imageBuffer.length > 1e7) response.send({error: 'Way to long', info: 'The image was way to large'});
								if (tags.image.imageBuffer.length > 1e7) delete tags.image;
								response.send(tags);
							} else response.send(tags);
						}).catch(err => response.send({error: 'Couldn\'t find ID3 tags', info: err}));
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

		app.get('/getLyrics/*', (request, response) => {
			const url = querystring.unescape(request.url);
			console.log(utils.logDate() + ' Got a request for ' + url);

			const urlArr = url.split('/').filter(val => {return val != ''});
			urlArr.shift();

			const artist = urlArr[0];
			const songName = urlArr[1];

			if (artist == undefined || artist.trim() == '') {
				response.send({success: false, error: 'No artist supplied'});
			} else if (songName == undefined || songName.trim() == '') {
				response.send({success: false, error: 'No title supplied'});
			} else {
				utils.fetch(`https://makeitpersonal.co/lyrics?artist=${artist}&title=${songName}`, https, URLModule).then(text => {
					if (text == "Sorry, We don't have lyrics for this song yet.")
						response.send({success: false, error: text});
					else
						response.send({success: true, lyrics: text});
				}).catch(err => {
					response.send({success: false, error: err});
				});
			}
		});

		app.get('/OldBrowsers/*', (request, response) => {
			const url = request.url;

			console.log('Got a request for ' + url + '. HAHA Your browser sucks');

			fileHandler.getJSON(fs, os, settings.audioFileExtensions.val, settings.videoFileExtensions.val, utils).then(json => {
				let html = '';
				const settings = require('./settings.js');
				// let html = '<script>function playSong(songName) {var elem = document.getElementById("audio"); elem.src = "/song/" + songName; elem.play()}</script><audio id="audio">YOUR BROWSER DOESN\'T SUPPORT THE AUDIO ELEMENT</audio>';

				json.audio.songs.forEach((object, key) => {
					// html += `<a onclick="playSong('${object.fileName}')" href="#">${object.fileName}</a><hr>`; // href="/song/${object.fileName}" target="_blank"

					if (!settings.ignoredAudioFiles.val.includes(object.fileName))
						html += `<a href="/song/${object.fileName}" target="_blank">${object.fileName}</a><hr>`;
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

				console.log(utils.logDate() + ' Got a POST request for ' + url);

				try {body = JSON.parse(body);}
				catch (err) {
					response.send({error: 'Couldn\'t parse to JSON', info: err});
					return;
				}

				if (body.name == settings.mostListenedPlaylistName.val)
					response.send({success: false, error: `Cannot access '${playlistName}'`, info: "This file is not editable"});
				else fileHandler.updatePlaylist(fs, body, settings.mostListenedPlaylistName.val).then(data => response.send(data)).catch(err => response.send(err));
			});
		});

		app.post('/updateMostListenedPlaylist', (request, response) => {
			let body = '';

			if (!settings.collectMostListened.val) {
				response.send({success: false, err: 'Settings specified that this is not permitted.', info: 'The settings specified that the user doesn\'t want to save songs.'});
				response.set("Connection", "close");
				return;
			}

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

				console.log(utils.logDate() + ' Got a POST request for ' + url);
				fs.exists(jsonPath, exists => {
					if (exists) {
						fs.readFile('./playlists.json', 'utf-8', (err, data) => {

							try {data = JSON.parse(data)} catch (err) {return}
							if (data[settings.mostListenedPlaylistName.val]) {
								songs = data[settings.mostListenedPlaylistName.val];

								if (body in songs) songs[body]++;
								else songs[body] = 1;
							} else songs[body] = 1;

							send();
						});
					} else {
						songs[body] = 1;
						send();
					}

					function send() {fileHandler.updatePlaylist(fs, {name: settings.mostListenedPlaylistName.val, songs: songs}, settings.mostListenedPlaylistName.val).then(data => response.send({success: true, data: body + ' successfully added to ' + settings.mostListenedPlaylistName.val})).catch(err => response.send({success: false, data: 'Something happened when tried to add ' + body + ' to ' + settings.mostListenedPlaylistName.val}));}
				});
			});
		});
	}
}