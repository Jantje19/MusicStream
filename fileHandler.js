module.exports = {
	searchSystem: function(fs, os, fileExtentions, utils) {
		const songsArr = [];
		const playlistsArr = [];
		const folderPath = os.homedir() + '/Music/';

		return new Promise((resolve, reject) => {
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
									else handleFolders(path + object + '/');
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

	// getPlaylistArr: function(fs) {
	// 	readPlayList: function(fs, dir) {
	// 		fs.readFile(dir).then(content => {
	// 			console.log(content);
	// 		}).catch(err => {
	// 			console.log(err);
	// 		})
	// 	}
	// },

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
	}
};