module.exports.updateHandler = (...args) => {
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
}