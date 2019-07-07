'use strict';

const tries = [];
let maxTries = 10;
const children = [];
const minUpime = 1000; // 1 second
let autoRestart = true;
const { fork } = require('child_process');

String.prototype.split = function(index) {
	return [this.substring(0, index), this.substring(index)];
}

// Finding process arguments
const foundVal = process.argv.find(val => {
	return val.trim().toLowerCase().startsWith('--maxtries');
});

if (foundVal) {
	const indexOfEqual = foundVal.indexOf('=');

	if (indexOfEqual >= 0) {
		const argVal = foundVal.split(indexOfEqual + 1)[1];

		if (!isNaN(argVal)) {
			const newVal = parseInt(argVal);

			if (!isNaN(newVal) && newVal >= 0)
				maxTries = newVal;
		}
	}
}

function closeMusicStream() {
	specialLog('Stopping MusicStream');
	children.forEach((object, key) => {
		try {
			object.exit(1);
		} catch (err) {}
	});

	removeAllChildren();
}

function processLine(line) {
	console.log(line + '!')
}

function triedTooManyTimes() {
	if (tries.length < maxTries) {
		const lastDate = tries[tries.length - 1];

		if (new Date().getTime() - lastDate.getTime() > minUpime)
			return false;
	}

	return true;
}

function specialLog(data) {
	console.log(`\x1b[4m\x1b[1m${data}\x1b[22m\x1b[24m`, '\x1b[0m');
}

function removeAllChildren() {
	for (let i = children.length - 1; i >= 0; i--) {
		children[i].removeAllListeners();
		children[i].kill();
		children.splice(i, 1);
	}
}

function start() {
	removeAllChildren();
	const child = fork('./main.js', process.argv, {
		silent: false
	});

	child.on('close', code => {
		specialLog('MusicStream closed with exitcode: ' + code);

		if (autoRestart) {
			if (code != 0 && code != 1) {
				if (!triedTooManyTimes()) {
					specialLog('Trying to restart...');
					setTimeout(() => {
						start();
					}, 1000);
				} else {
					specialLog("\x1b[33mTried too many times to restart. Exiting!\x1b[0m");
					process.exit(1);
				}
			} else {
				process.exit(0);
			}
		}
	});

	children.push(child);
	tries.push(new Date());
}


if (process.argv.includes('no-auto-restart'))
	autoRestart = false;
else if (process.argv.includes('auto-restart')) {
	const val = process.argv[process.argv.indexOf('auto-restart')];
	const equalIndex = val.indexOf('=');

	if (equalIndex > -1) {
		const splitArr = val.split('=');

		autoRestart = Boolean(splitArr[1]);
	}
}

start();

// For handling the commands when running: rs, cls and exit
process.stdin.resume();
process.stdin.setEncoding("ascii");
process.stdin.on('data', inp => {
	inp = inp.trim();

	if (inp == 'rs') {
		closeMusicStream();
		start();
	} else if (inp == 'cls' || inp == 'clear') {
		console.clear();
	} else if (inp == 'exit') {
		closeMusicStream();
	}
});