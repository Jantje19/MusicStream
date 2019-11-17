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
	searchSystem: (fs, os, path, utils, settings, silent) => {
		let paths = [];
		const songsArr = [];
		const videosObj = {};
		const subtitlesArr = [];
		const playlistsArr = [];
		const foundFileNames = [];

		const audioFileExtensions = settings.audioFileExtensions.val;
		const videoFileExtensions = settings.videoFileExtensions.val;

		if (settings.checkOsHomedirs.val) {
			// Folders that have to be searched
			paths.push(path.join(os.homedir(), '/Music/'));
			paths.push(path.join(os.homedir(), '/Videos/'));
		}

		if (settings.mediaPaths.val != '')
			paths = paths.concat(settings.mediaPaths.val);

		utils.colorLog(utils.logDate() + ' [[fgBlue, SEARCHSYSTEM:]] Starting checking files');

		return new Promise((resolve, reject) => {
			if (paths.length < 1)
				reject('No paths specified for checking.');

			const homedir = os.homedir();
			const checkDirs = paths.map(val => {
				return handleFolders(val.replace('{homedir}', homedir), utils, path);
			});

			// Wait untill the functions finish
			Promise.all(checkDirs).then(() => {
				setTimeout(() => {
					jsonFileArr = {
						audio: {
							playlists: playlistsArr,
							songs: songsArr
						},
						video: {
							subtitles: subtitlesArr,
							videos: videosObj,
						}
					};

					fs.writeFile(path.join(__dirname, '/JSON.json'), JSON.stringify(jsonFileArr, 2), err => {
						if (err) reject(err);
						else {
							utils.colorLog(utils.logDate() + ' [[fgBlue, SEARCHSYSTEM:]] Updated the Json file');
							resolve(jsonFileArr);
						}
					});
				}, 1000);
			}).catch(reject);
		});

		/*
		*	Responsible for recursive file search in a particular folder
		*
		*	@param {String} path
		*	@param {Object} utils
		*		The utils object in main.js
		*	@return {Promise}
		*/
		async function handleFolders(path, utils, pathModule) {
			const exists = await utils.fileExists(path);

			if (!exists)
				throw Error('Directory not found: ' + path);

			const addToVidArr = (path, fileName, fullPath, mtime) => {
				const getFolderFromPath = path => {
					return path.replace(/\\/g, '/').split('/').filter(val => { return val.trim().length > 0 }).pop();
				}

				let folderName = getFolderFromPath(path);
				if (paths.map(val => { return getFolderFromPath(val) }).includes(folderName))
					folderName = 'Root';

				if (folderName in videosObj)
					videosObj[folderName].push({ path, fileName, fullPath, lastChanged: mtime });
				else
					videosObj[folderName] = [{ path, fileName, fullPath, lastChanged: mtime }];
			}

			// Loop through all the files
			const promiseArr = (await fs.promises.readdir(path)).map(async object => {
				if (object.toLowerCase() !== 'desktop.ini') {
					// Check if file has same name
					if (foundFileNames.includes(object))
						console.wrn(`There are files with the same name: '${object}'`);
					else {
						const fileExtention = utils.getFileExtension(object.toLowerCase());
						const stats = await fs.promises.stat(pathModule.join(path, object));
						const fullPath = pathModule.join(path, object);
						const mtime = new Date(stats.mtime.toString());

						// Check if the file has a file extension that is in the arrays in index.js or that it is a playlist
						// If it is a file just execute this function again
						if (audioFileExtensions.includes(fileExtention)) {
							songsArr.push({ path, fileName: object, fullPath, lastChanged: mtime });
							foundFileNames.push(object);
						} else if (videoFileExtensions.includes(fileExtention)) {
							addToVidArr(path, object, fullPath, mtime);
							foundFileNames.push(object)
						} else if (fileExtention == '.m3u') {
							playlistsArr.push({ path, fileName: object, fullPath, lastChanged: mtime });
							foundFileNames.push(object);
						} else if (fileExtention == '.vtt') {
							subtitlesArr.push({ path, fileName: object, fullPath });
							foundFileNames.push(object);
						} else if (!fileExtention && fs.lstatSync(pathModule.join(path, object)).isDirectory()) {
							handleFolders(pathModule.join(path, object, '/'), utils, pathModule);
						} else if (fileExtention && !silent) {
							console.wrn('File extention not supported', object);
						} else if (fileExtention && silent) {
						} else {
							console.wrn('Something is weird...', 'FILENAME:' + object, 'EXTENSION:' + fileExtention);
						}
					}
				}
			});

			return await Promise.all(promiseArr);
		}
	},

	/*
	*	Returns a Promise with all all the playlists on the system an their contents
	*
	*	@param {Object} audio
	*		Array from fileHandler.getJSON.audio
	*	@return {Promise}
	*/
	getPlaylists: (audio, fs, fileHandler, utils, full = false) => {
		const handleM3UFiles = () => {
			return Promise.all(audio.playlists.map(async object => {
				const songsArr = await fileHandler.readPlayList(fs, object.fullPath, utils, audio.songs);

				if (full)
					return songsArr;

				return object.fileName;

				if (songsArr.length > 0)
					return object.fileName;
				else
					throw Error(`Playlist '${object.fileName}' is empty`);
			}));
		}

		const handlePlaylistsFile = async () => {
			const playlistsFileLoc = './playlists.json';

			if (!await utils.fileExists(playlistsFileLoc))
				return [];

			try {
				const data = await fs.promises.readFile(playlistsFileLoc, 'utf-8');

				if (!data)
					return [];

				const parsedData = await utils.safeJSONParse(data);

				if (full)
					return parsedData;

				return Object.keys(parsedData);
			} catch (err) {
				return [];
			}
		}

		return Promise.all([handleM3UFiles(), handlePlaylistsFile()]);
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
	readPlayList: async (fs, path, utils, songsArr) => {
		const songs = [];

		songsArr = songsArr.map(val => val.fileName);

		if (!await utils.fileExists(path))
			throw Error(`'${path}' does not exist`);

		// Split by every song
		(await fs.promises.readFile(path, 'utf-8'))
			.replace('#EXTM3U', '')
			.split(/#EXTINF:[0-9]+,.+/)
			.forEach(object => {
				object = object.trim();

				if (object != '') {
					const match = object.match(/(.+)(\/|\\)(.+)$/);
					if (match) {
						const songName = match[3].toString().trim();

						if (songsArr.includes(songName))
							songs.push(songName);
					}
				}
			});

		return songs;
	},

	updatePlaylist: async (fs, body, utils) => {
		const jsonPath = './playlists.json';
		const write = async (content, alreadyExists) => {
			await fs.promises.writeFile(jsonPath, JSON.stringify(content, null, '\t'));

			if (alreadyExists)
				return `Playlist with the name '${body.name}' successfuly updated`
			else
				return `Playlist with the name '${body.name}' successfuly added`;
		}

		if (utils.fileExists(jsonPath)) {
			const data = await utils.safeJSONParse(await fs.promises.readFile(jsonPath, 'utf-8'));

			if (body.delete == true) {
				if (!(body.name in data))
					throw Error(`'${body.name}' not found in 'playlists.json'`);

				delete data[body.name];
				return await write(data, true);
			} else {
				data[body.name] = body.songs;
				return await write(data, (body.name in data));
			}
		} else {
			const obj = {};
			obj[body.name] = body.songs;
			return await write(obj, false);
		}
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
	getJSON: async (fs, os, path, utils, settings) => {
		const JSONPath = './JSON.json';

		if (await utils.fileExists(JSONPath)) {
			const data = await fs.promises.readFile(JSONPath, 'utf-8');
			return await utils.safeJSONParse(data);
		} else {
			console.wrn('The JSON file does not exist, so I am creating one...');
			return await this.searchSystem(fs, os, path, utils, settings);
		}
	},

	/*
	*	Uses id3 module to get song tags
	*
	*	@param {String} path
	*		File location
	*	@param {Object} id3
	*		id3 module
	*	@param {Object} utils
	*		MusicStream utils object
	*	@return {Promise}
	*/
	getSongInfo: (path, id3, utils) => {
		return new Promise((resolve, reject) => {
			utils.fileExists(path).then(exists => {
				if (!exists)
					reject('File does not exist');
				else {
					id3.read(path, (err, tags) => {
						if (err)
							reject(err);
						else
							resolve(tags);
					});
				}
			});
		});
	},

	/*
	*	Loops through the Plugins dir and organizes them for further handling
	*
	*	@return {Promise}
	*/
	getPlugins: async (pathModule, utils, fs) => {
		const path = pathModule.join(__dirname, '/Plugins/');

		if (!await utils.fileExists(path))
			return [];
		else {
			return await Promise.all((await fs.promises.readdir(path)).map(async object => {
				const indexPath = pathModule.join(path, object, '/index.js');

				if (await utils.fileExists(indexPath)) {
					return {
						module: require(indexPath),
						folder: object,
					};
				} else {
					console.err('No index.js file found in ' + path);
					return {
						notfound: true
					};
				}
			}));
		}
	}
};