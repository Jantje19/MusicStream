const fs = require('fs');
const os = require('os');
const id3 = require('node-id3');
const server = require('./server.js');
const querystring = require('querystring');
const fileHandler = require('./fileHandler.js');

const videoFileExtentions = ['.mp4', '.avi'];
const audioFileExtentions = ['.mp3', '.m3a', '.wav'];
const mostListenedPlaylistName = 'mostListened';

const utils = {
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
	}
}

server.start(__dirname + '/WebInterface/', fileHandler, fs, os, audioFileExtentions, videoFileExtentions, utils, querystring, id3, mostListenedPlaylistName);