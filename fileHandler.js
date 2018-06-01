module.exports = {
	/*
	*	Searches system for media files
	*
	*	@param {Object} fs
	*		Native NodeJS fs module
	*	@param {Object} os
	*		Native NodeJS os module
	*	@param {Object} utils
	*		Utils object from main.js
	*	@param {Object} settings
	*		Settings from settings file
	*	@param {Boolean} silent
	*		If it should log errors
	*	@return {Promise}
	*/
	searchSystem: (fs, os, utils, settings, silent) => {
		let paths = [];
		const songsArr = [];
		const videosObj = {};
		const subtitlesArr = [];
		const playlistsArr = [];

		const audioFileExtensions = settings.audioFileExtensions.val;
		const videoFileExtensions = settings.videoFileExtensions.val;

		if (settings.checkOsHomedirs.val) {
			// Folders that have to be searched
			paths.push(os.homedir() + '/Music/');
			paths.push(os.homedir() + '/Videos/');
		}

		if (settings.mediaPaths.val != '')
			paths = paths.concat(settings.mediaPaths.val);

		utils.colorLog(utils.logDate() + ' [[fgBlue, SEARCHSYSTEM:]] Starting checking files');

		return new Promise((resolve, reject) => {
			if (paths.length < 1)
				reject('No paths specified for checking.');

			const homedir = os.homedir();
			const checkDirs = paths.map(val => {
				// handleFolders(val.replace('{homedir}', homedir), utils).then(data => resolve(data)).catch(err => reject(err));
				handleFolders(val.replace('{homedir}', homedir), utils).then(data => {}).catch(err => reject(err));
			});

			// Wait untill the functions both finish
			Promise.all(checkDirs).then(() => {
				setTimeout(() => {
					jsonFileArr = {
						audio: {
							songs: songsArr,
							playlists: playlistsArr
						},
						video: {
							videos: videosObj,
							subtitles: subtitlesArr
						}
					};

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

		/*
		*	Responsible for recursive file search in a particular folder
		*
		*	@param {String} path
		*	@param {Object} utils
		*		The utils object in main.js
		*	@return {Promise}
		*/
		function handleFolders(path, utils) {
			return new Promise((resolve, reject) => {
				fs.exists(path, exists => {
					if (exists) {
						fs.readdir(path, (err, files) => {
							if (err) reject(err);
							else {
								const addToVidArr = (path, fileName, mtime) => {
									const getFolderFromPath = path => {
										return path.replace(/\\/g, '/').split('/').filter(val => {return val.trim().length > 0}).pop();
									}

									let folderName = getFolderFromPath(path);
									if (paths.map(val => {return getFolderFromPath(val)}).includes(folderName))
										folderName = 'Root';

									if (folderName in videosObj)
										videosObj[folderName].push({path: path, fileName: fileName, lastChanged: mtime});
									else
										videosObj[folderName] = [{path: path, fileName: fileName, lastChanged: mtime}];
								}

								// Loop through all the files
								files.forEach((object, key) => {
									if (object.toLowerCase() != 'desktop.ini') {
										const fileExtention = utils.getFileExtention(object.toLowerCase());

										fs.stat(path + object, (err, stats) => {
											const mtime = new Date(stats.mtime.toString());

											// Check if the file has a file extension that is in the arrays in index.js or that it is a playlist
											// If it is a file just execute this function again
											if (audioFileExtensions.includes(fileExtention))
												songsArr.push({path: path, fileName: object, lastChanged: mtime});
											else if (videoFileExtensions.includes(fileExtention))
												addToVidArr(path, object, mtime);
											else if (fileExtention == '.m3u')
												playlistsArr.push({path: path, fileName: object, lastChanged: mtime});
											else if (fileExtention == '.vtt')
												subtitlesArr.push({path: path, fileName: object});
											else if (!fileExtention && fs.lstatSync(path + object).isDirectory())
												handleFolders(path + object + '/', utils);
											else if (fileExtention && !silent)
												console.wrn('File extention not supported', object);
											else if (fileExtention && silent);
											else
												console.wrn('Something is weird...', 'FILENAME:' + object, 'EXTENSION:' + fileExtention);
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

	/*
	*	Parses a .m3u file
	*
	*	@param {Object} fs
	*		Native NodeJS fs module
	*	@param {String} path
	*		The playlist file path
	*	@param {Array} songsArr
	*		Array from fileHandler.getJSON.audio.songs
	*	@return {Promise}
	*/
	readPlayList: (fs, path, songsArr) => {
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
										const songName = match[3].toString().trim();

										if (findSong(songsArr, songName))
											songs.push(songName);
									}
								}
							});

							resolve(songs);
						}
					});
				} else reject('File doesn\'t exist');
			});
		});

		function findSong(songsArr, songName) {
			return songsArr.map(val => {return val.fileName}).includes(songName);
		}
	},

	updatePlaylist: (fs, body, mostListenedPlaylistName) => {
		const jsonPath = 'playlists.json';

		return new Promise((resolve, reject) => {
			fs.exists(__dirname + '/' + jsonPath, exists => {
				if (exists) {
					fs.readFile(__dirname + '/' + jsonPath, 'utf-8', (err, data) => {
						if (err)
							reject({success: false, err: 'An error occured', info: err});
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
						if (err)
							reject({success: false, error: 'There was an error with creating the playlist file', info: err});
						else if (alreadyExists)
							resolve({success: true, data: `Playlist with the name '${body.name}' successfuly updated`});
						else
							resolve({success: true, data: `Playlist with the name '${body.name}' successfuly added`});
					} catch (err) {
						reject({success: false, error: 'There was an error with creating the playlist file', info: err})
					}
				});
			}
		});
	},

	/*
	*	Reads the JSON.json file
	*
	*	@param {Object} fs
	*		Native NodeJS fs module
	*	@param {Object} os
	*		Native NodeJS os module
	*	@param {Object}
	*		Utils object in main.js
	*	@param {Object} settings
	*		Settings from settings.js
	*	@return {Promise}
	*/
	getJSON: (fs, os, utils, settings) => {
		return new Promise((resolve, reject) => {
			const JSONPath = './JSON.json';

			fs.exists(JSONPath, exists => {
				if (exists) {
					fs.readFile(JSONPath, 'utf-8', (err, data) => {
						if (err)
							reject(err);
						else
							resolve(JSON.parse(data));
					});
				} else {
					console.wrn('The JSON file does not exist, so I am creating one...');
					resolve(this.searchSystem(fs, os, utils, settings));
				}
			});
		});
	},

	/*
	*	Uses id3 module to get song tags
	*
	*	@param {String} path
	*		File location
	*	@param {Object} id3
	*		id3 module
	*	@param {Object} fs
	*		Native NodeJS fs module
	*	@return {Promise}
	*/
	getSongInfo: (path, id3, fs) => {
		return new Promise((resolve, reject) => {
			fs.exists(path, exists => {
				if (exists) {
					id3.read(path, (err, tags) => {
						if (err)
							reject(err);
						else
							resolve(tags);
					});
				} else reject('File does not exist');
			});
		});
	}
};