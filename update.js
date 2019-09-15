if (process.argv[2] === 'spawned') {
	const msi = require('musicstream-installer');
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
		console.log(`Installing MusicStream in '${process.argv[3]}'. Do not close this window!`);
		msi.updateMusicstream(process.argv[3], (...args) => {
			if (args[0] === 'download') {
				process.stdout.cursorTo(0);
				process.stdout.clearLine(1);

				if (args[1] === Infinity && args[3] === 0)
					process.stdout.write(`DOWNLOADING: ${args[2].toFixed(1)}MB`);
				else {
					const afterStr = `(${args[1].toFixed(2)}%) - ${args[3].toFixed(1)}`;
					const termWidth = process.stdout.columns;
					const availableWidth = (termWidth - afterStr.length - 3) / 2;
					let space = '';
					let str = '';

					const strVal = availableWidth / 100 * args[1] - 2;
					if (strVal > 0)
						str = '='.repeat(strVal);

					const spaceVal = availableWidth - str.length - 2;
					if (spaceVal > 0)
						space = ' '.repeat(spaceVal);

					process.stdout.write(`[${str}>${space}]${afterStr}MB`);
				}

				process.stdout.cursorTo(0);
			} else {
				console.log('Update:', ...args);
			}
		}, (...args) => {
			console.log('Done!', ...args);
			end();
		}, (...args) => {
			console.error('Error:', ...args);
		});
	}).catch(err => {
		console.log('Can\'t write', err);
		end();
	});
} else {
	const { spawn } = require('child_process');

	console.log('Starting in new console...');
	const subprocess = spawn(`"${process.argv[0]}"`, [__filename, 'spawned', __dirname], {
		detached: true,
		stdio: 'ignore',
		shell: true,
	});

	subprocess.unref();
}