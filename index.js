const fs = require('fs');
const os = require('os');
const https = require('https');
const id3 = require('node-id3');
const URLModule = require('url');
const ytdl = require('ytdl-core');
const server = require('./server.js');
const querystring = require('querystring');
const fileHandler = require('./fileHandler.js');


// Settings
const settings = require('./settings.js');
// For version checking
const {version} = require('./package.json');

const startServer = () => {
	const startServerModule = () => server.start(__dirname + '/WebInterface/', fileHandler, fs, os, settings, utils, querystring, id3, ytdl, version, https, URLModule);

	if (settings.updateJsonOnStart.val == true) {
		fileHandler.searchSystem(fs, os, settings.audioFileExtensions.val, settings.videoFileExtensions.val, utils).then(startServerModule).catch(err => {
			console.err('Couln\'t update the JSON file.', err);
			startServerModule();
		});
	} else startServerModule();
}

// Usefull functions
const utils = {
	logDate: function() {
		const date = new Date();

		function convertToDoubleDigit(num) {
			if (num.toString().length < 2) return "0" + num;
			else return num;
		}

		return `${convertToDoubleDigit(date.getHours())}:${convertToDoubleDigit(date.getMinutes())}:${convertToDoubleDigit(date.getSeconds())}`;
	},

	getFileExtention: function(fileName) {
		const match = fileName.match(/.+(\.\w+)$/i);

		if (match) return match[1];
		else return;
	},

	sortJSON: function(json) {
		const newArr = [];

		for (key in json)
			newArr.push([key, json[key]]);

		newArr.sort((a, b) => {return a[1] - b[1]});
		newArr.reverse();
		return newArr;
	},

	sendFile: function(fs, path, response) {
		if (path.endsWith('/')) path = path + 'index.html';

		fs.exists(path, exists => {
			if (exists) {
				if (utils.getFileExtention(path) == '.html') {
					fs.readFile(path, 'utf-8', (err, data) => {
						if (err) response.status(500).send('Error: 500. An error occured: ' + err);
						else {
							for (key in settings) {
								data = data.replace(new RegExp(`\{\{${key}\}\}`, 'g'), settings[key].val);
							}

							response.status(200).send(data);
						}
					});
				} else response.status(200).sendFile(path);
			} else response.status(404).sendFile(__dirname + '/WebInterface/404.html');
		});
	},

	fetch: function(url, https, URLModule, headers) {
		return new Promise((resolve, reject) => {
			const options = URLModule.parse(url);

			options.headers = headers;
			https.get(options, res => {
				let rawData = '';

				const {statusCode} = res;
				const contentType = res.headers['content-type'];

				if (statusCode !== 200) {
					reject('Request Failed.\n' + `Status Code: ${statusCode}`);
					res.resume();
					return;
				}

				res.setEncoding('utf8');

				res.on('data', chunk => {rawData += chunk;});
				res.on('end', () => {
					if (/^application\/json/.test(contentType)) {
						try {
							resolve(JSON.parse(rawData));
						} catch(err) {
							reject(err);
						}
					} else resolve(rawData);
				});
			}).on('error', err => reject(err));
		});
	},

	newVersionAvailable: function(version) {
		function compareVersions(version1, version2) {
			version1 = version1.split('.');
			version2 = version2.split('.');

			if (version1.length == version2.length) {
				for (let i = 0; i < version1.length; i++) {
					const num1 = Number(version1[i]);
					const num2 = Number(version2[i]);

					if (num1 && num2) {
						if (num1 < num2)
							return 1;
						else if (num1 != num2)
							return 0;
					} else {
						if (version1[i] != version2[i])
							return 0;
					}
				}

				return -1;
			} else return 0;
		}

		return new Promise((resolve, reject) => {
			// Github needs a header to be sent
			const header = {'User-Agent':'Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 6.0)'};

			console.log(utils.logDate() + ' Checking for updates. Connecting to Github...');
			utils.fetch('https://api.github.com/repos/Jantje19/MusicStream/releases/latest', https, URLModule, header).then(response => {
				// Check if the returned value is JSON
				if (response.constructor == {}.constructor) {
					const versionSame = compareVersions(response.tag_name, version);

					if (versionSame == 0)
						resolve({isAvailable: false, version: version});
					else if (versionSame > 0)
						resolve({isAvailable: false, version: version, greater: true, url: response.html_url});
					else if (versionSame < 0)
						resolve({isAvailable: true, version: response.tag_name, url: response.html_url});
					else
						reject('Version check went wrong.');
				} else reject('The response is not json, so it is useless');
			}).catch(err => reject);
		});
	},

	humanFileSize: function(bytes, si) {
		let thresh = si ? 1000 : 1024;

		if(Math.abs(bytes) < thresh)
			return bytes + ' B';

		let u = -1;
		const units = si
		? ['kB','MB','GB','TB','PB','EB','ZB','YB']
		: ['KiB','MiB','GiB','TiB','PiB','EiB','ZiB','YiB'];

		do {
			bytes /= thresh;
			++u;
		} while(Math.abs(bytes) >= thresh && u < units.length - 1);

		return bytes.toFixed(1) + ' '+ units[u];
	},

	// I don't want to import modules I can write myself
	colorLog: function(text, color) {
		const regEx = /\[\[(.+)\,(\s+)?(.+)\]\]/i;
		const colors = {
			reset: "\x1b[0m",
			fgBlack: "\x1b[30m",
			fgRed: "\x1b[31m",
			fgGreen: "\x1b[32m",
			fgOrange: "\x1b[33m",
			fgBlue: "\x1b[34m",
			fgMagenta: "\x1b[35m",
			fgCyan: "\x1b[36m",
			fgYellow: "\x1b[93m",
			fgWhite: "\x1b[37m",
			bgBlack: "\x1b[40m",
			bgRed: "\x1b[41m",
			bgGreen: "\x1b[42m",
			bgOrange: "\x1b[43m",
			bgBlue: "\x1b[44m",
			bgMagenta: "\x1b[45m",
			bgCyan: "\x1b[46m",
			bgWhite: "\x1b[47m"
		}

		try {
			text.match(new RegExp(regEx, 'gi')).forEach((object, key) => {
				object = object.match(regEx);
				text = text.replace(object[0], colors[object[1]] + object[3] + colors.reset);
			});
		} catch(err) {}

		if (color) {
			if (colors[color]) console.log(colors[color], text, colors.reset);
			else console.log(text);
		} else console.log(text);
	}
}

// Console.err is a console.error log in red:
console.err = (...args) => console.error("\x1b[31m", ...args, "\x1b[0m");
// Console.wrn is a console.warn log in orange:
console.wrn = (...args) => console.warn("\x1b[33m", ...args, "\x1b[0m");

// Check args
if (process.argv.includes('check-updates')) {
	utils.newVersionAvailable(version).then(newVersion => {
		if (newVersion.greater)
			utils.colorLog(`No update available, running version: ${newVersion.version}. But this version if greater than that on GitHub (${newVersion.version}), Maybe you want to get the newest code from GitHub: [[fgMagenta, ${newVersion.url}]]`, 'fgOrange');
		else if (newVersion.isAvailable == true)
			utils.colorLog(`A new update is available: ${newVersion.version}. You can download it at: [[fgMagenta, ${newVersion.url}]]`, 'fgGreen');
		else
			utils.colorLog(`No update available, running version: ${newVersion.version}`, 'fgCyan');
	}).catch(err => {
		console.wrn('An error occurred when checking for updates:', err);
		startServer();
	});

	return;
} else if (process.argv.includes('update-json')) {
	fileHandler.searchSystem(fs, os, settings.audioFileExtensions.val, settings.videoFileExtensions.val, utils).then(json => {
		console.log('Successfully updated the JSON file.');
	}).catch(err => {
		console.log('There was an error with updating the JSON:', err);
	});

	return;
}

utils.colorLog(new Date() + ' [[fgGreen, Starting MusicStream]]');
if (settings.checkForUpdateOnStart.val == true) {
	utils.newVersionAvailable(version).then(newVersion => {
		if (newVersion.greater) {
			utils.colorLog(`No update available, running version: ${newVersion.version}. But this version if greater than that on GitHub (${newVersion.version}), Maybe you want to get the newest code from GitHub: [[fgMagenta, ${newVersion.url}]]`, 'fgOrange');
		} else if (newVersion.isAvailable == true) {
			utils.colorLog(`A new update is available: ${newVersion.version}`, 'fgGreen');
		} else {
			utils.colorLog(`No update available, running version: ${newVersion.version}`, 'fgCyan');
			startServer();
		}
	}).catch(err => {
		console.wrn('An error occurred when checking for updates: ' + err + '. Starting server...');
		startServer();
	});
} else startServer();