const fs = require('fs');
const os = require('os');
const id3 = require('node-id3');
const ytdl = require('ytdl-core');
const server = require('./server.js');
const querystring = require('querystring');
const fileHandler = require('./fileHandler.js');

// Settings
const settings = require('./settings.js');

const startServer = () => server.start(__dirname + '/WebInterface/', fileHandler, fs, os, settings, utils, querystring, id3, ytdl);
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
				} else response.sendFile(path);
			} else response.status(404).send('Error: 404. File not found');
		});
	},

	// Í don't want to import modules I can write myself
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

utils.colorLog(new Date() + ' [[fgGreen, Starting MusicStream]]');

if (settings.updateJsonOnStart.val == true) {
	fileHandler.searchSystem(fs, os, settings.audioFileExtensions.val, settings.videoFileExtensions.val, utils).then(startServer).catch(err => {
		console.err('Couln\'t update the JSON file.', err);
		startServer();
	});
} else startServer();
