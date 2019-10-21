if (process.argv.includes('--help') || process.argv.includes('-h') || process.argv.includes('help')) {
	console.log(
		'Available arguments:\n\tinstall [PLUGIN URL]:\tInstalls a plugin'
	);
	process.exit();
}

if (process.argv.length < 4) {
	console.error('Unable to find the url');
	process.exit();
}

const { updateHandler } = require('./installer-helper');
msi.installPlugin(__dirname, process.argv[3], updateHandler)
	.then(console.log)
	.catch(console.error);