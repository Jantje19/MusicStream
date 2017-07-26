const fs = require('fs');
const os = require('os');
const id3 = require('node-id3');
const ytdl = require('ytdl-core');
const server = require('./server.js');
const querystring = require('querystring');
const fileHandler = require('./fileHandler.js');

// Settings
const settings = require('./settings.js');

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
	}
}

console.log(new Date() + ' Starting MusicStream');

const startServer = () => server.start(__dirname + '/WebInterface/', fileHandler, fs, os, settings, utils, querystring, id3, ytdl);

fileHandler.searchSystem(fs, os, settings.audioFileExtensions.val, settings.videoFileExtensions.val, utils).then(startServer).catch(err => {
	console.log('Couln\'t update the JSON file.', err);
	startServer();
});