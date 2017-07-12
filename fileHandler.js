module.exports = {
	searchSystem: function(fs, os, audioFileExtensions, videoFileExtensions, utils) {
		const songsArr = [];
		const videosArr = [];
		const playlistsArr = [];
		const audioFolderPath = os.homedir() + '/Music/';
		const videoFolderPath = os.homedir() + '/Videos/';

		console.log('Starting checking files');
		return new Promise((resolve, reject) => {
			Promise.all([handleFolders(audioFolderPath, utils), handleFolders(videoFolderPath, utils)]).then(() => {
				setTimeout(() => {
					jsonFileArr = {audio: {songs: songsArr, playlists: playlistsArr}, video: {videos: videosArr}};

					fs.writeFile(__dirname + '/JSON.json', JSON.stringify(jsonFileArr), (err) => {
						if (err) throw err;
						else console.log('Updated the Json file');
					});

					resolve(jsonFileArr);
				}, 1000);
			}).catch(err => {
				reject(err);
			});
		});

		function handleFolders(path, utils) {
			return new Promise((resolve, reject) => {
				if (path.indexOf('node_modules') < 0) {
					fs.readdir(path, (err, files) => {
						if (err) reject(err);
						else {
							Array.prototype.contains = function(str) {
								return this.indexOf(str) >= 0 ? true : false;
							}

							files.forEach((object, key) => {
								if (object.toLowerCase() != 'desktop.ini') {
									const fileExtention = utils.getFileExtention(object.toLowerCase());

									fs.stat(path + object, (err, stats) => {
										const ctime = new Date(stats.ctime.toString());

										if (audioFileExtensions.includes(fileExtention)) songsArr.push({path: path, fileName: object, lastChanged: ctime});
										else if (videoFileExtensions.includes(fileExtention)) videosArr.push({path: path, fileName: object, lastChanged: ctime});
										else if (fileExtention == '.m3u') playlistsArr.push({path: path, fileName: object, lastChanged: ctime});
										else if (fileExtention) console.log('File extention not supported', object);
										else if (!fileExtention && fs.lstatSync(path + object).isDirectory()) handleFolders(path + object + '/', utils);
										else console.warn('Something is weird...', 'FILENAME:' + object, 'EXTENSION:' + fileExtention);
									});
								}
							});

							resolve();
						}
					});
				} else {
					resolve();
				}
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
					console.log('Nope');
					resolve(this.searchSystem(fs, os, audioFileExtensions, videoFileExtensions, utils));
				}
			});
		});
	},

	getSettings: function(fs) {
		return new Promise((response, reject) => {
			const path = './settings.json';

			fs.exists(path, exists => {
				if (exists) {
					fs.readFile(path, 'utf-8', (err, data) => {
						if (err) reject(err);
						else resolve(data);
					});
				} else reject('File doesn\'t exist');
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