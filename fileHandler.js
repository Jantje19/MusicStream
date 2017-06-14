module.exports = {
	searchSystem: function(fs, os, fileExtentions, utils) {
		const songsArr = [];
		const playlistsArr = [];
		const folderPath = os.homedir() + '/Music/';

		return new Promise((resolve, reject) => {
			console.log('Starting checking files');
			return handleFolders(folderPath, utils).then(() => {
				setTimeout(() => {
					jsonFileArr = {songs: songsArr, playlists: playlistsArr};

					fs.writeFile(__dirname + '/JSON.json', JSON.stringify(jsonFileArr), (err) => {
						if (err) throw err;
						else console.log('Updated the Json file');
					});

					resolve(jsonFileArr);
				}, 500);
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

									if (fileExtentions.contains(fileExtention)) songsArr.push({path: path, fileName: object});
									else if (fileExtention == '.m3u') playlistsArr.push({path: path, fileName: object});
									else if (fileExtention) console.log('File extention not supported', object);
									else if (!fileExtention) handleFolders(path + object + '/', utils);
									else console.warn('Something is weird...', object, fileExtention);
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
			// if (body.name == mostListenedPlaylistName) reject({success: false, error: `Cannot access '${playlistName}'`, info: "This file is not editable"});

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

	getJSON: function(fs, os, fileExtentions, utils) {
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
					resolve(this.searchSystem(fs, os, fileExtentions, utils));
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