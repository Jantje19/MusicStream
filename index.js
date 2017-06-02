const fs = require('fs');
const os = require('os');
const server = require('./server.js');
const querystring = require('querystring');
const fileHandler = require('./fileHandler.js');

const fileExtentions = ['.mp3', '.m3a', '.wav'];

const utils = {
	getFileExtention: function(fileName) {
		const match = fileName.match(/.+(\.\w+)$/);

		if (match) return match[1];
		else return;
	}
}

server.start(__dirname + '/WebInterface/', fileHandler, fs, os, fileExtentions, utils, querystring);