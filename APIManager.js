const tmpQueueSave = { audio: { global: {} }, videos: {} };
const handleError = (response, message, error) => {
	if (error)
		console.err(message + ':\t' + error);
	if (error instanceof Error)
		console.log(error.stack);

	response.send({ success: false, error: message });
}

module.exports = (app, dirname, fileHandler, fs, os, pathModule, settings, utils, id3, https, querystring, URLModule, ytdl, ffmpeg) => {
	app.get('/data/*', (request, response) => {
		const url = request.url;
		console.log(utils.logDate() + ' Got a request for ' + url);
		const sortMethod = (function () {
			const parsedUrl = URLModule.parse(url, true);

			if (parsedUrl.query && parsedUrl.query.sort)
				return parsedUrl.query.sort.toLowerCase();

			return '';
		}());

		fileHandler.getJSON(fs, os, pathModule, utils, settings).then(json => {
			const subtitles = ('subtitles' in json.video) ? json.video.subtitles.map(val => val.fileName) : [];
			const videos = {};
			const songs = [];

			const handleVideos = obj => {
				for (key in obj) {
					videos[key] = obj[key].map(val => {
						return val.fileName;
					}).filter(val => {
						return !(settings.ignoredVideoFiles.val.includes(val));
					});
				}
			}

			if (json.audio.songs.length > 0 || Object.keys(json.video.videos).length > 0) {
				if (sortMethod && (sortMethod === 'newest' || sortMethod === 'oldest'))
					json.audio.songs.sort(sortFunc);

				if (sortMethod === 'oldest')
					json.audio.songs.reverse();

				json.audio.songs.forEach(object => songs.push(object.fileName));
				handleVideos(json.video.videos);

				fileHandler.getPlaylists(json.audio, fs, fileHandler, utils).then(playlists => {
					playlists = playlists.flat();

					response.send({
						audio: {
							songs: songs.filter(val => {
								return !(settings.ignoredAudioFiles.val.includes(val))
							}),
							playlists: playlists
						},
						video: {
							videos: videos,
							subtitles: subtitles
						}
					});
				}).catch(err => {
					handleError(response, 'Either getting the songs or getting the playlists or both went wrong', err);
				});
			} else
				handleError(response, 'There are no media files found on this device');
		}).catch(err => {
			handleError(response, 'There was an error with finding media files', err);
		});

		const sortFunc = (a, b) => {
			const dateA = new Date(a.lastChanged);
			const dateB = new Date(b.lastChanged);
			return dateB - dateA;
		}
	});

	app.get('/checkForUpdates', (request, response) => {
		console.log(utils.logDate() + ' Got a request for ' + request.url);

		utils.newVersionAvailable(version).then(newVersion => {
			response.send({ success: true, data: newVersion });
		}).catch(err => {
			handleError(response, err);
		});
	});

	app.get('/getSettings', (request, response) => {
		console.log(utils.logDate() + ' Got a request for ' + request.url);

		response.send({
			data: settings,
			success: true,
		});
	});

	app.get('/downloadYoutube*', (request, response) => {
		const url = querystring.unescape(request.url);

		console.log(utils.logDate() + ' Got a request for ' + url);
		utils.sendFile(fs, pathModule.join(dirname, 'downloadYoutube.html'), response);
	});

	app.get('/youtubeData/:id', (request, response) => {
		const url = querystring.unescape(request.url);
		const id = request.params.id;

		console.log(utils.logDate() + ' Got a request for ' + url);
		if (ytdl.validateID(id)) {
			try {
				ytdl.getInfo(id, (err, info) => {
					if (err)
						handleError(response, 'No info found for that video id', err);
					else
						response.send({ success: true, data: info });
				});
			} catch (err) {
				handleError(response, 'Unable to find YouTube data', err);
			}
		} else {
			handleError(response, 'The provided ID is not a valid YouTube id');
		}
	});

	app.get('/getSavedQueue/:type', (request, response) => {
		const url = querystring.unescape(request.url);
		console.log(utils.logDate() + ' Got a request for ' + url);

		if ('type' in request.params) {
			const paramsType = request.params.type.toLowerCase();

			if (paramsType === 'audio' || paramsType === 'video') {
				const args = URLModule.parse(url, true);

				const sendData = data => {
					if (data && data.queue)
						response.send({ success: true, data })
					else
						handleError(response, 'Nothing saved');
				}

				if (paramsType === 'audio') {
					if (args) {
						let objectKey = ('for' in args) ? args.for : request.ip;

						if (objectKey) {
							if (objectKey.toLowerCase() == 'global')
								sendData(tmpQueueSave.audio.global);
							else {
								objectKey = request.ip;

								if (objectKey in tmpQueueSave.audio)
									sendData(tmpQueueSave.audio[objectKey]);
								else
									sendData(null);
							}
						} else sendData(tmpQueueSave.audio.global);
					} else sendData(null);
				} else if (paramsType === 'video') {
					sendData(tmpQueueSave.video);
				} else {
					sendData(null);
				}

				return;
			}
		}

		handleError(response, 'Invalid type');
	});

	app.post('/updateJSON', (request, response) => {
		console.log(utils.logDate() + ' Got a request for ' + request.url);

		utils.handlePostRequest(request)
			.then(() => {
				fileHandler.searchSystem(fs, os, pathModule, utils, settings).then(data => {
					response.send({ success: true, data });
				}).catch(err => {
					handleError(response, "There was an error with updating the JSON", err);
				});
			})
			.catch(err => {
				handleError(response, 'Unable to parse request body', err);
			});
	});

	app.post('/ytdl*', (request, response) => {
		const url = querystring.unescape(request.url);
		console.log(utils.logDate() + ' Got a POST request for ' + url);

		utils.handlePostRequest(request)
			.then(json => {
				const sendData = data => {
					if (!response.headersSent)
						response.send(data);
				}

				const sendError = err => {
					console.err(err);

					try {
						sendData({
							error: err.toString(),
							jsonUpdated: false,
							success: false,
						});
					} catch (err) { }
				}

				const handleProgress = (chunkLength, downloaded, total) => {
					try {
						process.stdout.cursorTo(0);
						process.stdout.clearLine(1);
						process.stdout.write("DOWNLOADING: " + (downloaded / total * 100).toFixed(2) + '% ');
					} catch (err) { }
				}

				const handleEnd = (path, json) => {
					process.stdout.write('\n');

					utils.fileExists(path).then(exists => {
						if (exists) {
							fileHandler.searchSystem(fs, os, pathModule, utils, settings).then(() => {
								sendData({ success: true, fileName: json.fileName + '.mp3', jsonUpdated: true });
							}).catch(err => {
								console.error(err);
								sendData({ success: true, fileName: json.fileName, jsonUpdated: false });
							});
						} else {
							throw Error('File does not exist');
						}
					}).catch(err => {
						console.error(err);
						sendError("File does not exist. This is a weird problem... You should investigate.");
					});
				}

				const handleVideo = json => {
					const path = pathModule.join(os.homedir(), '/Videos/', json.fileName + '.mp4');
					const video = ytdl(json.url, { filter: function (format) { return format.container === 'mp4'; } });

					video.pipe(fs.createWriteStream(path));
					video.on('progress', handleProgress);
					video.on('error', sendError);
					video.on('end', () => {
						handleEnd(path, json);
					});
				}

				const handleAudio = (json, ffmpeg) => {
					const path = pathModule.join(os.homedir(), '/Music/', json.fileName + '.mp3');
					const args = {
						format: 'mp3',
						bitrate: 128
					}

					if (json.startTime > -1)
						args.seek = json.startTime;
					if (json.endTime > 1)
						args.duration = json.endTime;

					const reader = ytdl('https://youtube.com/watch?v=' + (new URL(json.url)).searchParams.get('v'), { filter: 'audioonly' });
					const writer = ffmpeg(reader).format(args.format).audioBitrate(args.bitrate);

					if (args.seek) writer.seekInput(args.seek);
					if (args.duration) writer.duration(args.duration);

					writer.on('error', sendError);
					reader.on('progress', handleProgress);
					reader.on('end', () => {
						writer.on('end', () => {
							handleEnd(path, json);
						});
					});

					reader.on('error', sendError);
					writer.output(path).run();
				}

				if (json.url && json.fileName && json.type) {
					// Sanitize file name
					json.fileName = json.fileName.replace('\/', '\\');
					json.fileName = json.fileName.replace(/[/\\?%*:|"<>]/g, '');

					if (!ytdl.validateURL(json.url)) {
						sendError('Invalid url');
						return;
					}

					if (json.startTime) {
						const parsedVal = parseInt(json.startTime, 10);

						if (!Number.isNaN(parsedVal))
							json.startTime = parsedVal;
						else
							json.startTime = -1;
					}
					if (json.endTime) {
						const parsedVal = parseInt(json.endTime, 10);

						if (!Number.isNaN(parsedVal))
							json.endTime = parsedVal;
						else
							json.endTime = -1;
					}

					if (json.type == 'video')
						handleVideo(json);
					else if (json.type == 'audio')
						handleAudio(json, ffmpeg);
					else sendError('Type not correct');
				} else sendError('Tags not found. Expected url, fileName and tags.');
			})
			.catch(err => {
				handleError(response, 'Unable to parse request body', err);
			});
	});

	app.post('/updateSettings', (request, response) => {
		console.log(utils.logDate() + ' Got a POST request for ' + request.url);

		utils.handlePostRequest(request)
			.then(body => {
				const jsonPath = './settings.js';

				// Copy the settings
				const data = Object.assign({}, settings);

				for (key in body)
					data[key].val = body[key];

				fs.writeFile(jsonPath, 'module.exports = ' + JSON.stringify(data, null, '\t'), err => {
					if (err)
						handleError(response, 'Unable to write settings file', err);
					else {
						response.send({ success: true });
						console.wrn('MusicStream restarting because the settings updated!');
						process.exit(131);
					}
				});
			})
			.catch(err => {
				handleError(response, 'Unable to parse request body', err);
			});
	});

	app.post('/saveQueue/:type', (request, response) => {
		console.log(utils.logDate() + ' Got a POST request for ' + request.url);

		if (request.params.type) {
			utils.handlePostRequest(request)
				.then(body => {
					if (request.params.type.toLowerCase() === 'audio') {
						let objectKey = ('for' in body) ? body.for : request.ip;
						const queueIndex = ('queueIndex' in body) ? body.queueIndex : 0;
						const timeStamp = ('timeStamp' in body) ? body.timeStamp : 0;
						const queue = ('queue' in body) ? body.queue : [];

						if (objectKey.toLowerCase() == 'global') {
							tmpQueueSave.audio.global = { queueIndex, timeStamp, queue };
							response.send({ success: true });
						} else {
							tmpQueueSave.audio[request.ip] = { queueIndex, timeStamp, queue };
							response.send({ success: true });
						}
					} else if (request.params.type.toLowerCase() === 'video') {
						const queueIndex = ('queueIndex' in body) ? body.queueIndex : 0;
						const timeStamp = ('timeStamp' in body) ? body.timeStamp : 0;
						const subtitle = ('subtitle' in body) ? body.subtitle : null;
						const queue = ('queue' in body) ? body.queue : [];

						tmpQueueSave.video = { queueIndex, timeStamp, queue, subtitle };
						response.send({ success: true });
					} else {
						handleError(response, 'Invalid type');
					}
				})
				.catch(err => {
					handleError(response, 'Unable to parse request body', err);
				});
		} else {
			handleError(response, 'No type specified');
			request.connection.destroy();
		}
	});

	/* Audio */
	app.get('/playlist/:playlist', (request, response) => {
		if (request.params.playlist) {
			const playlistName = request.params.playlist.trim();
			const url = querystring.unescape(request.url);

			console.log(utils.logDate() + ' Got a request for ' + url);

			// Check if it has a file extension, otherwise read the playlists.json file
			if (settings.audioFileExtensions.val.includes(utils.getFileExtension(playlistName))) {
				fileHandler.getJSON(fs, os, pathModule, utils, settings).then(json => {
					const inArray = (function (playlists, name) {
						for (let i = 0; i < playlists.length; i++) {
							if (playlists[i].fileName == name)
								return { val: true, index: i };
						}

						return { val: false, index: -1 };
					}(json.audio.playlists, playlistName));

					// Check if the playlist actually exists
					if (inArray.val == true) {
						const playlist = json.audio.playlists[inArray.index];

						// Let fileHandler.js handle this
						fileHandler.readPlayList(fs, pathModule.join(playlist.path, playlist.fileName), utils, json.audio.songs).then(songsArr => {
							response.send({ success: true, songs: songsArr });
						}).catch(err => {
							handleError(response, 'There was an error with reading the playlist', err);
						});
					} else
						handleError(response, `The playlist '${playlistName}' was not found`);
				}).catch(err => {
					console.err('There was an error with getting the JSON file', err);
					response.send({ error: "There was an error with getting the JSON file", info: err });
				});
			} else {
				// If it doesn't have a file extension look for it in the playlists file
				utils.fileExists('./playlists.json').then(exists => {
					const parsedUrl = URLModule.parse(url);
					let showFull = false;

					if (parsedUrl) {
						if ('pathname' in parsedUrl) {
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
										handleError(response, 'Unable to read playlists file', err);
									else {
										utils.safeJSONParse(data).then(data => {
											if (playlistName == settings.mostListenedPlaylistName.val && !showFull && playlistName in data)
												response.send({ success: true, songs: utils.sortJSON(data[settings.mostListenedPlaylistName.val]).map(val => { return val[0] }) });
											else if (playlistName == settings.mostListenedPlaylistName.val && showFull && playlistName in data)
												response.send({ success: true, songs: utils.sortJSON(data[settings.mostListenedPlaylistName.val]) });
											else if (playlistName in data)
												response.send({ success: true, songs: data[playlistName] });
											else
												handleError(response, 'Playlist not found');
										}).catch(err => {
											handleError(response, 'Unable to parse JSON', err);
										});
									}
								});
							} else
								handleError(response, `The playlist '${playlistName}' was not found`);
						} else
							handleError(response, 'The server couldn\'t handle the URL')
					}
				}).catch(err => {
					handleError(response, 'Unable to read playlists file', err);
				});
			}

			return;
		}

		handleError(response, 'No playlist found');
	});

	app.get('/song/:songName', (request, response) => {
		const url = querystring.unescape(request.url);

		console.log(utils.logDate() + ' Got a request for ' + url);

		fileHandler.getJSON(fs, os, pathModule, utils, settings).then(json => {
			const songName = request.params.songName.trim();
			const song = json.audio.songs.find(val => {
				return val.fileName === songName;
			});

			if (song)
				response
					.header('Cache-Control', 'public, max-age=3600')
					.sendFile(song.fullPath);
			else
				handleError(response, `The song '${songName}' was not found`);
		}).catch(err => {
			handleError(response, 'There was an error with getting the song', err);
		});
	});

	app.get('/songInfo/:songName', (request, response) => {
		console.log(utils.logDate() + ' Got a request for ' + querystring.unescape(request.url));

		if (!request.params.songName) {
			handleError(response, 'Song name not specified');
			return;
		}

		fileHandler.getJSON(fs, os, pathModule, utils, settings).then(json => {
			const song = json.audio.songs.find(val => {
				return val.fileName === request.params.songName;
			});

			if (song) {
				fileHandler.getSongInfo(song.fullPath, id3, utils).then(tags => {
					if (tags.image) {
						if (tags.image.imageBuffer) {
							if (tags.image.imageBuffer.length > 1e7)
								delete tags.image;
						}
					}

					response.send({
						success: true,
						tags
					});
				}).catch(err => {
					handleError(response, 'Couldn\'t find ID3 tags', err);
				});
			} else
				handleError(response, `'${songName}' was not found`);
		}).catch(err => {
			handleError(response, 'Unable to get songs list', err);
		});
	});

	app.get('/getLyrics/:artist/:songName', (request, response) => {
		const url = querystring.unescape(request.url);
		console.log(utils.logDate() + ' Got a request for ' + url);

		if (!request.params.artist)
			handleError(response, 'No artist supplied');
		else if (!request.params.songName)
			handleError(response, 'No title supplied');
		else {
			console.log(`${utils.logDate()} Fetching lyrics for '${request.params.songName}' from '${request.params.artist}'`);
			utils.fetch(`https://makeitpersonal.co/lyrics?artist=${querystring.escape(request.params.artist)}&title=${querystring.escape(request.params.songName)}`, https, URLModule).then(text => {
				if (text === "Sorry, We don't have lyrics for this song yet.")
					handleError(response, 'Lyrics not found on makeitpersonal', text);
				else
					response.send({ success: true, lyrics: text });
			}).catch(err => {
				handleError(response, 'Unable to fetch lyrics', err);
			});
		}
	});

	app.post('/updatePlaylist', (request, response) => {
		console.log(utils.logDate() + ' Got a POST request for ' + request.url);

		utils.handlePostRequest(request)
			.then(json => {
				if (json.name === settings.mostListenedPlaylistName.val)
					handleError(response, `Cannot access '${json.name}'. This file is not editable`);
				else if (json.song && json.songs.length < 1)
					handleError(response, 'No songs defined');
				else
					fileHandler.updatePlaylist(fs, json, utils)
						.then(data => {
							response.send({
								success: true,
								data
							});
						})
						.catch(err => {
							handleError(response, 'Unable to update the playlist', err);
						});
			}).catch(err => {
				handleError(response, 'Unable to handle request body', err);
			});
	});

	app.post('/tags*', (request, response) => {
		console.log(utils.logDate() + ' Got a POST request for ' + request.url);

		utils.handlePostRequest(request)
			.then(json => {
				if (!(json.tags && json.songName)) {
					response.send({
						error: 'Invalid data: no tags and songName',
						success: false,
					});
					return;
				}

				fileHandler.getJSON(fs, os, pathModule, utils, settings).then(songs => {
					/*
					*	Gets called when downloading is done. Handles response
					*/
					function done(song) {
						id3.write(json.tags, song.fullPath, err => {
							if (err)
								handleError(response, 'Unable to write tags to file', err);
							else
								response.send({ success: true });
						});
					}

					const song = songs.audio.songs.find(val => {
						return val.fileName === json.songName;
					});

					if (!song) {
						handleError(response, `Unable to find '${json.fileName}'`);
						return;
					}

					if (json.tags.delete) {
						id3.removeTags(song.fullPath, err => {
							if (err)
								handleError(response, 'Unable to remove tags from file', err);
							else
								response.send({ success: true });
						});
					} else {
						if (json.tags.image) {
							utils.getImage(json.tags.image).then(imageBuffer => {
								json.tags.image = imageBuffer;
								done(song);
							}).catch(err => {
								console.err(err);
								response.send({ success: false, info: err })
							});

							return;
						}

						done(song);
					}
				}).catch(err => {
					handleError(response, 'Unable get songs list', err);
				});
			}).catch(err => {
				handleError(response, 'Unable to handle request body', err);
			});
	});

	app.post('/updateMostListenedPlaylist', (request, response) => {
		console.log(utils.logDate() + ' Got a POST request for ' + request.url);

		if (!settings.collectMostListened.val) {
			handleError(response, 'Settings prohibit the collection of the MostListened playlist');
			response.set("Connection", "close");
			request.connection.destroy();
			return;
		}

		utils.handlePostRequest(request)
			.then(body => {
				const jsonPath = './playlists.json';
				let songs = {};

				fileHandler.getJSON(fs, os, pathModule, utils, settings).then(data => {
					if (!data.audio.songs.map(val => { return val.fileName }).includes(body)) {
						handleError(response, 'Song not found');
						return;
					}

					utils.fileExists(jsonPath)
						.then(exists => {
							if (exists) {
								fs.readFile('./playlists.json', 'utf-8', (err, data) => {
									if (err) {
										handleError(response, 'Error while reading playlists file', err);
										return;
									}

									utils.safeJSONParse(data).then(json => {
										if (!json[settings.mostListenedPlaylistName.val])
											songs[body] = 1;
										else {
											songs = json[settings.mostListenedPlaylistName.val];

											if (body in songs)
												songs[body]++;
											else
												songs[body] = 1;
										}

										send();
									}).catch(err => {
										handleError(response, 'Unable to parse playlists file', err);
									});
								});
							} else {
								songs[body] = 1;
								send();
							}

							function send() {
								fileHandler.updatePlaylist(fs, { name: settings.mostListenedPlaylistName.val, songs }, utils)
									.then(() => response.send({ success: true, data: body + ' successfully added to ' + settings.mostListenedPlaylistName.val }))
									.catch(err => {
										handleError(response, `Something happened when trying to add '${body}' to '${settings.mostListenedPlaylistName.val}'`, err);
									});
							}
						})
						.catch(err => {
							handleError(response, 'Unable to determine if file exists', err);
						});
				}).catch(err => {
					handleError(response, 'Unable to fetch songs list', err);
				});
			}).catch(err => {
				handleError(response, 'Unable to handle request body', err);
			});
	});

	/* Video */
	app.get('/video/:fileName', (request, response) => {
		const url = querystring.unescape(request.url);
		console.log(utils.logDate() + ' Got a request for ' + url);

		if (!request.params.fileName)
			return handleError(response, 'No file name found');

		fileHandler.getJSON(fs, os, pathModule, utils, settings).then(json => {
			const video = (function () {
				for (let key in json.video.videos) {
					const foundVal = json.video.videos[key].find(val => {
						return val.fileName === request.params.fileName;
					});
					if (foundVal)
						return foundVal;
				}

				return null;
			})();

			if (video)
				response
					.header('Cache-Control', 'public, max-age=3600')
					.sendFile(video.fullPath);
			else
				handleError(response, `The video '${fileName}' was not found`);
		}).catch(err => {
			handleError(response, 'Unable to get videos list', err);
		});
	});

	app.get('/subtitle/:fileName', (request, response) => {
		const url = querystring.unescape(request.url);
		console.log(utils.logDate() + ' Got a request for ' + url);

		if (!request.params.fileName)
			return handleError(response, 'File name parameter not found');

		fileHandler.getJSON(fs, os, pathModule, utils, settings).then(json => {
			// Get the index of the subtitle object
			const file = json.video.subtitles.find(val => {
				return val.fileName === request.params.fileName;
			});

			if (file)
				utils.sendFile(fs, file.fullPath, response);
			else
				handleError(response, 'Unable to find file');
		}).catch(err => {
			handleError(response, 'Unable to get subtitles list', err);
		});
	});
}