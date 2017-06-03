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
									const match = object.match(/(.+)\/(.+)$/);
									if (match) {
										const songName = match[2].trim();

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
	}
};