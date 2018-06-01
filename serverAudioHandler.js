const tmpQueueSave = {global: {}};

module.exports = {
	start: (app, dirname, fileHandler, fs, os, settings, utils, querystring, id3, https, URLModule) => {
		app.get('/playlist/*', (request, response) => {
			const url = querystring.unescape(request.url);

			console.log(utils.logDate() + ' Got a request for ' + url);

			if (!url.endsWith('/')) {
				// Check if it has a file extention, otherwise read the playlists.json file
				if (url.match(/(.+)\.(\w{2,5})/)) {
					fileHandler.getJSON(fs, os, utils, settings).then(json => {
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
					// If it doesn't have a file extension look for it in the playlists file
					fs.exists('./playlists.json', exists => {
						const parsedUrl = URLModule.parse(url);
						let showFull = false;

						if (parsedUrl) {
							if ('pathname' in parsedUrl) {
								const name = querystring.unescape(parsedUrl.href.match(/(.+)\/(.+)/)[2]);

								if ('query' in parsedUrl) {
									const queryParameters = querystring.parse(parsedUrl.query);

									if ('full' in queryParameters) {
										if (Boolean(queryParameters.full))
											showFull = Boolean(queryParameters.full);
									}
								}

								if (exists) {
									fs.readFile('./playlists.json', 'utf-8', (err, data) => {
										if (err)
											response.send({error: 'Cannot read the file', info: err});
										else {
											data = JSON.parse(data);

											if (name == settings.mostListenedPlaylistName.val && !showFull && name in data)
												response.send({songs: utils.sortJSON(data[settings.mostListenedPlaylistName.val]).map(val => {return val[0]})});
											else if (name == settings.mostListenedPlaylistName.val && showFull && name in data)
												response.send({songs: utils.sortJSON(data[settings.mostListenedPlaylistName.val])});
											else if (name in data)
												response.send({songs: data[name]});
											else
												response.send({success: false, error: 'Playlist not found', info: 'The specified playlist wasn\'t found on the server'})
										}
									});
								} else response.send({success: false, error: `The playlist '${name}' was not found`, info: "The 'playlists.json' file had no reference to this file"});
							} else response.send({success: false, error: 'Non valid URL', info: 'The server couln\'t handle the URL`'})
						} else response.send({success: false, error: 'Non valid URL', info: 'The server couln\'t handle the URL'})
					});
				}

				/*
				*	Finds the video from the filename
				*
				*	@param {Array} playlists
				*		The fileHandler.getJSON.audio.playlists Array
				*	@param {String} fileName
				*		The playlist file name
				*	@return {Object}
				*		@param {Boolean} val
				*			Stores if the playlist was found
				*		@param {Boolean} index
				*			The index of the playlist in the array. Less than 0 if not found
				*/
				function findPlaylist(playlists, name) {
					for (let i = 0; i < playlists.length; i++) {
						if (playlists[i].fileName == name)
							return {val: true, index: i};
					}

					return {val: false, index: -1};
				}
			} else {
				response.send({"error": "No playlist found"});
			}
		});
		//

		app.get('/song/*', (request, response) => {
			const url = querystring.unescape(request.url);

			console.log(utils.logDate() + ' Got a request for ' + url);

			if (!url.endsWith('/')) {
				fileHandler.getJSON(fs, os, utils, settings).then(json => {
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

			/*
			*	Finds the song from the filename
			*
			*	@param {Array} songs
			*		The fileHandler.getJSON audio.songs Array
			*	@param {String} fileName
			*		The song file name
			*	@return {Object}
			*		@param {Boolean} val
			*			Stores if the song was found
			*		@param {Boolean} index
			*			The index of the song in the array. Less than 0 if not found
			*/
			function findSong(songs, songName) {
				for (let i = 0; i < songs.length; i++) {
					if (songs[i].fileName == songName)
						return {val: true, index: i};
				}

				return {val: false, index: -1};
			}
		});

		app.get('/songInfo/*', (request, response) => {
			const url = querystring.unescape(request.url);
			console.log(utils.logDate() + ' Got a request for ' + url);

			if (!url.endsWith('/')) {
				fileHandler.getJSON(fs, os, utils, settings).then(json => {
					const songName = url.match(/(.+)\/(.+)$/)[2].trim();
					const inArray = findSong(json.audio.songs, songName);

					if (inArray.val == true) {
						const song = json.audio.songs[inArray.index];

						fileHandler.getSongInfo(song.path + song.fileName, id3, fs).then(tags => {
							if (tags.image) {
								if (tags.image.imageBuffer) {
									if (tags.image.imageBuffer.length > 1e7)
										delete tags.image;

									response.send(tags);
									return;
								}
							}

							response.send(tags);
						}).catch(err => response.send({error: 'Couldn\'t find ID3 tags', info: err}));
					} else response.send({error: `The song '${songName}' was not found`, info: "The cached JSON file had no reference to this file"});
				}).catch(err => response.send({error: "There was an error with getting the song", info: err}));
			} else {
				response.send({error: "No song found"});
			}

			/*
			*	Finds the song from the filename
			*
			*	@param {Array} songs
			*		The fileHandler.getJSON audio.songs Array
			*	@param {String} fileName
			*		The song file name
			*	@return {Object}
			*		@param {Boolean} val
			*			Stores if the song was found
			*		@param {Boolean} index
			*			The index of the song in the array. Less than 0 if not found
			*/
			function findSong(songs, songName) {
				for (let i = 0; i < songs.length; i++) {
					if (songs[i].fileName == songName)
						return {val: true, index: i};
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
						response.send({success: false, error: text + " <a style=\"color: gray\" target=\"_blank\" href=\"https://makeitpersonal.co/songs/new\">Add them yourself.</a>"});
					else
						response.send({success: true, lyrics: text});
				}).catch(err => {
					response.send({success: false, error: err});
				});
			}
		});

		app.get('/OldBrowsers/*', (request, response) => {
			const url = request.url;

			console.log(utils.logDate() + ' Got a request for ' + url);

			fileHandler.getJSON(fs, os, utils, settings).then(json => {
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

		app.get('/saveQueue', (request, response) => {
			const url = querystring.unescape(request.url);
			const params = querystring.parse(URLModule.parse(url).query);

			console.log(utils.logDate() + ' Got a request for ' + url);

			const sendData = (data) => {
				if (data) {
					if (data.queue)
						response.send({success: true, data: data})
					else
						response.send({success: false, error: 'Nothing saved (yet)'})
				} else response.send({success: false, error: 'Nothing saved (yet)'});
			}

			if (params) {
				let objectKey = ('for' in params) ? params.for : request.connection.remoteAddress;

				if (objectKey) {
					if (objectKey.toLowerCase() == 'global')
						sendData(tmpQueueSave.global);
					else {
						objectKey = request.connection.remoteAddress;

						if (objectKey in tmpQueueSave)
							sendData(tmpQueueSave[objectKey]);
						else
							sendData(null);
					}
				} else sendData(tmpQueueSave.global);
			} else sendData(null);
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

				try {
					body = JSON.parse(body);
				} catch (err) {
					response.send({error: 'Couldn\'t parse to JSON', info: err});
					return;
				}

				if (body.name == settings.mostListenedPlaylistName.val)
					response.send({success: false, error: `Cannot access '${body.name}'`, info: "This file is not editable"});
				else
					fileHandler.updatePlaylist(fs, body, settings.mostListenedPlaylistName.val).then(data => response.send(data)).catch(err => response.send(err));
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
					response.send({success: false, info: 'Couln\'t parse JSON'});
					return;
				}

				if (json.tags && json.songName) {
					if (json.songName.toLowerCase().endsWith('.mp3')) {

						fileHandler.getJSON(fs, os, utils, settings).then(songs => {
							/*
							*	Finds the song from the filename
							*
							*	@param {Array} files
							*		The fileHandler.getJSON audio.songs Array
							*	@param {String} songName
							*		The songs name
							*	@return {Object}
							*		The song object
							*/
							function findSong(array, songName) {
								for (let i = 0; i < array.length; i++) {
									if (array[i].fileName == songName)
										return array[i];
								}
							}

							/*
							*	Fetches the image from url
							*
							*	@param {String} url
							*		The image url
							*	@return {Promise}
							*/
							function getImage(url) {
								return new Promise((resolve, reject) => {
									Stream = require('stream').Transform;

									https.request(url, response => {
										const data = new Stream();

										response.on('data', chunk => {
											data.push(chunk);
										});

										response.on('error', reject);
										response.on('end', function() {
											const buffer = data.read();

											if (buffer instanceof Buffer)
												resolve(buffer);
											else
												reject('Not a buffer');
										});
									}).end();
								});
							}

							/*
							*	Gets calles when downloading is done. Handles response
							*/
							function done() {
								const songLocation = findSong(songs.audio.songs, json.songName);

								if (songLocation) {
									if (id3.write(json.tags, songLocation.path + json.songName))
										response.send({success: true});
									else
										response.send({success: false, info: 'Something went wrong with writing the tags'});
								} else response.send({success: false, info: 'Song not found in JSON'});
							}

							if (json.tags.delete) {
								if (id3.removeTags(findSong(songs.audio.songs, json.songName).path + json.songName))
									response.send({success: true});
								else
									response.send({success: false, info: "Tags not deleted"});
							} else {
								if (json.tags.image) {
									getImage(json.tags.image).then(imageBuffer => {
										json.tags.image = imageBuffer;
										done();
									}).catch(err => {
										console.err(err);
										response.send({success: false, info: err})
									});
								} else done();
							}
						}).catch(err => {console.err(err); response.send({success: false, info: JSON.stringify(err)})});
					} else response.send({success: false, info: 'The required tags (tags, songName) are not found.'});
				} else response.send({success: false, info: 'Not an audio file.'});
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
				fileHandler.getJSON(fs, os, utils, settings).then(data => {
					if (data.audio.songs.map(val => {return val.fileName}).includes(body)) {
						fs.exists(jsonPath, exists => {
							if (exists) {
								fs.readFile('./playlists.json', 'utf-8', (err, data) => {

									try {data = JSON.parse(data)} catch (err) {response.send({success: false, data: 'Couldn\'t parse JSON'}); return}
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

							function send() {
								fileHandler.updatePlaylist(fs, {name: settings.mostListenedPlaylistName.val, songs: songs}, settings.mostListenedPlaylistName.val)
								.then(data => response.send({success: true, data: body + ' successfully added to ' + settings.mostListenedPlaylistName.val}))
								.catch(err => response.send({success: false, data: 'Something happened when tried to add ' + body + ' to ' + settings.mostListenedPlaylistName.val}));
							}
						});
					} else response.send({success: false, data: 'Song not found'});
				}).catch(err => {
					response.send({success: false, data: 'Couldn\'t get songs'});
				})
			});
		});

		app.post('/saveQueue', (request, response) => {
			let body = '';

			request.on('data', data => {
				body += data;

				if (body.length > 1e6) {
					request.send({success: false, error: 'The amount of data is to high', info: 'The connection was destroyed because the amount of data passed is to much'});
					request.connection.destroy();
				}
			});

			request.on('end', () => {
				const url = querystring.unescape(request.url);

				console.log(utils.logDate() + ' Got a POST request for ' + url);

				try {
					body = JSON.parse(body);
				} catch (err) {
					response.send({success: false, error: 'Unable to parse JSON', info: err});
					return;
				}

				let objectKey = ('for' in body) ? body.for : request.connection.remoteAddress;
				const queueIndex = ('queueIndex' in body) ? body.queueIndex : 0;
				const timeStamp = ('timeStamp' in body) ? body.timeStamp : 0;
				const queue = ('queue' in body) ? body.queue : [];

				if (objectKey.toLowerCase() == 'global') {
					tmpQueueSave.global = {
						queueIndex: queueIndex,
						timeStamp: timeStamp,
						queue: queue
					}

					response.send({success: true});
				} else {
					tmpQueueSave[request.connection.remoteAddress] = {
						queueIndex: queueIndex,
						timeStamp: timeStamp,
						queue: queue
					}

					response.send({success: true});
				}
			});
		});
	}
}