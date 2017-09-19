module.exports = {
	searchSystem: function(fs, os, utils, settings) {
		let paths = [];
		const songsArr = [];
		const videosArr = [];
		const playlistsArr = [];

		const audioFileExtensions = settings.audioFileExtensions.val;
		const videoFileExtensions = settings.videoFileExtensions.val;

		if (settings.checkOsHomedirs.val) {
			// Folders that have to be searched
			paths.push(os.homedir() + '/Music/');
			paths.push(os.homedir() + '/Videos/');
		}

		paths = paths.concat(settings.mediaPaths.val);
		utils.colorLog(utils.logDate() + ' [[fgBlue, SEARCHSYSTEM:]] Starting checking files');

		return new Promise((resolve, reject) => {
			if (paths.length < 1)
				reject('No paths specified for checking.');

			const homedir = os.homedir();
			const checkDirs = paths.map(val => {
				handleFolders(val.replace('{homedir}', homedir), utils).then(data => resolve(data)).catch(err => reject(err));
			});

			// Wait untill the functions both finish
			Promise.all(checkDirs).then(() => {
				setTimeout(() => {
					jsonFileArr = {audio: {songs: songsArr, playlists: playlistsArr}, video: {videos: videosArr}};

					fs.writeFile(__dirname + '/JSON.json', JSON.stringify(jsonFileArr), err => {
						if (err) reject(err);
						else {
							utils.colorLog(utils.logDate() + ' [[fgBlue, SEARCHSYSTEM:]] Updated the Json file');
							resolve(jsonFileArr);
						}
					});
				}, 1000);
			}).catch(err => {
				reject('Err' + err);
			});
		});

		function handleFolders(path, utils) {
			return new Promise((resolve, reject) => {
				fs.exists(path, exists => {
					if (exists) {
						fs.readdir(path, (err, files) => {
							if (err) reject(err);
							else {
								// Loop through all the files
								files.forEach((object, key) => {
									if (object.toLowerCase() != 'desktop.ini') {
										console.log(object);
										const fileExtention = utils.getFileExtention(object.toLowerCase());

										fs.stat(path + object, (err, stats) => {
											const ctime = new Date(stats.ctime.toString());

											// Check if the file has a file extension that is in the arrays in index.js or that it is a playlist
											// If it is a file just execute this function again
											if (audioFileExtensions.includes(fileExtention)) songsArr.push({path: path, fileName: object, lastChanged: ctime});
											else if (videoFileExtensions.includes(fileExtention)) videosArr.push({path: path, fileName: object, lastChanged: ctime});
											else if (fileExtention == '.m3u') playlistsArr.push({path: path, fileName: object, lastChanged: ctime});
											else if (fileExtention) console.wrn('File extention not supported', object);
											else if (!fileExtention && fs.lstatSync(path + object).isDirectory()) handleFolders(path + object + '/', utils);
											else console.wrn('Something is weird...', 'FILENAME:' + object, 'EXTENSION:' + fileExtention);
										});
									}
								});

								resolve();
							}
						});
					} else reject('Directory not found: ' + path);
				});
			});
		}
	},

	readPlayList: function(fs, path, songsArr) {
		// Check if file exists
		// Load the file from disk
		// Check if all the songs are in the json
		const songs = [];

		return new Promise((resolve, reject) => {
			fs.exists(path, exists => {
				if (exists) {
					fs.readFile(path, 'utf-8', (err, data) => {
						if (err) reject(err);
						else {
							data = data.replace('#EXTM3U', '');

							// Split by every song
							data.split(/#EXTINF:[0-9]+,.+/).forEach((object, key) => {
								object = object.trim();

								if (object != '') {
									const match = object.match(/(.+)(\/|\\)(.+)$/);
									if (match) {
										const songName = match[3].trim();
										if (findSong(songsArr, songName)) songs.push(songName);
									}
								}
							});

							resolve(songs);
						}
					});
				} else reject('File doesn\'t exist');
			});
		});

		function findSong(songs, songName) {
			for (let i = 0; i < songs.length; i++) {
				if (songs[i].fileName == songName) return true;
			}

			return false;
		}
	},

	updatePlaylist: function(fs, body, mostListenedPlaylistName) {
		const jsonPath = 'playlists.json';

		return new Promise((resolve, reject) => {
			fs.exists(__dirname + '/' + jsonPath, exists => {
				if (exists) {
					fs.readFile(__dirname + '/' + jsonPath, 'utf-8', (err, data) => {
						if (err) reject({success: false, err: 'An error occured', info: err});
						else {
							data = JSON.parse(data);

							if (body.delete == true) {
								delete data[body.name];
								write(data, true);
							} else {
								if (body.name in data) {
									data[body.name] = body.songs;
									write(data, true);
								} else {
									data[body.name] = body.songs;
									write(data, false);
								}
							}
						}
					});
				} else {
					const obj = {};
					obj[body.name] = body.songs;
					write(obj, false);
				}
			});

			function write(content, alreadyExists) {
				fs.writeFile(__dirname + '/' + jsonPath, JSON.stringify(content), (err) => {
					try {
						if (err) reject({success: false, error: 'There was an error with creating the playlist file', info: err});
						else if (alreadyExists) resolve({success: true, data: `Playlist with the name '${body.name}' successfuly updated`});
						else resolve({success: true, data: `Playlist with the name '${body.name}' successfuly added`});
					} catch (err) {console.warn('Can\'t do that'); reject({success: false, error: 'There was an error with creating the playlist file', info: err})}
				});
			}
		});
	},

	getJSON: function(fs, os, audioFileExtensions, videoFileExtensions, utils) {
		return new Promise((resolve, reject) => {
			const JSONPath = './JSON.json';

			fs.exists(JSONPath, exists => {
				if (exists) {
					fs.readFile(JSONPath, 'utf-8', (err, data) => {
						if (err) reject(err);
						else resolve(JSON.parse(data));
					});
				} else {
					console.wrn('The JSON file does not exist, so I am creating one...');
					resolve(this.searchSystem(fs, os, audioFileExtensions, videoFileExtensions, utils));
				}
			});
		});
	},

	getSongInfo: function(path, id3, fs) {
		return new Promise((resolve, reject) => {
			fs.exists(path, exists => {
				if (exists) resolve(id3.read(path));
				else reject('File does not exist');
			});
		});
	}
};