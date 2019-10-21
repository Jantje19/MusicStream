if (process.argv[2] === 'spawned') {
	const msi = require('musicstream-installer');

	const { updateHandler } = require('./installer-helper');
	const { promises, constants } = require('fs');
	const { access } = promises;

	const end = () => {
		console.log("Press 'Enter' to continue");
		process.stdin.setRawMode(true);
		process.stdin.resume();
		process.stdin.on('data', data => {
			if (data[0] == 0x0d || data[0] == 0x03) {
				console.log('Closing...');
				process.stdin.removeAllListeners();
				setTimeout(() => {
					process.exit(0);
				}, 500);
			}
		});
	}

	access(__filename, constants.F_OK | constants.W_OK | constants.R_OK).then(() => {
		console.log(`Installing MusicStream in '${process.argv[3]}'.\nDo not close this window!`);
		msi.updateMusicstream(process.argv[3], updateHandler, (...args) => {
			console.log('Done!', ...args);
			end();
		}, (...args) => {
			console.error('Error:', ...args);
		}, {
			latestCommit: process.argv.includes('latestCommit')
		});
	}).catch(err => {
		console.log('Can\'t write', err);
		end();
	});
} else {
	const latestCommit = process.argv.includes('--latest-commit');
	const { spawn } = require('child_process');

	if (process.argv.includes('--help') || process.argv.includes('-h') || process.argv.includes('help')) {
		console.log(
			'Available arguments:\n\t--latest-commit:\tInstalls the latest commit instead of the latest release'
		);
		process.exit();
	}

	console.log('Starting in new console...');
	const subprocess = spawn(`"${process.argv[0]}"`, [__filename, 'spawned', __dirname, (latestCommit === true) ? 'latestCommit' : ''], {
		detached: true,
		stdio: 'ignore',
		shell: true,
	});

	subprocess.unref();
}