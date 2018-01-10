module.exports = {
	start: (app, dirname, fileHandler, fs, os, settings, utils, querystring) => {
		app.get('/video/*', (request, response) => {
			const url = querystring.unescape(request.url);
			console.log(utils.logDate() + ' Got a request for ' + url);

			if (!url.endsWith('/')) {
				fileHandler.getJSON(fs, os, utils, settings).then(json => {
					const fileName = url.match(/(.+)\/(.+)$/)[2].trim();
					const inArray = findSong(json.video.videos, fileName);

					if (inArray.val == true) {
						const video = inArray.video;
						response.sendFile(video.path + video.fileName);

						/*const filePath = video.path + video.fileName;

						response.writeHead(200, {
							"Accept-Ranges": "bytes",
							"Content-Type": "video/mp4"
						});

						const readStream = fs.createReadStream(filePath);
						readStream.on('open', () => {
							readStream.pipe(response);
						});

						readStream.on('error', err => {
							response.send(err);
						});*/
					} else response.send({error: `The video '${fileName}' was not found`, info: "The cached JSON file had no reference to this file"});
				}).catch(err => response.send({error: "There was an error with getting the video", info: err}));
			} else {
				response.send({error: "No video found"});
			}

			function findSong(files, fileName) {
				const keys = Object.keys(files);

				for (let j = 0; j < keys.length; j++) {
					for (let i = 0; i < files[keys[j]].length; i++) {
						if (files[keys[j]][i].fileName == fileName)
							return {val: true, video: files[keys[j]][i]};
					}
				}

				return {val: false, index: -1};
			}
		});

		app.get('*subtitle*', (request, response) => {
			const url = querystring.unescape(request.url);
			const fileName = url.replace('/subtitle/', '');
			console.log(utils.logDate() + ' Got a request for ' + url);

			fileHandler.getJSON(fs, os, utils, settings).then(json => {
				const index = json.video.subtitles.map(val => {return val.fileName}).indexOf(fileName);

				if (index > -1) {
					const fileData = json.video.subtitles[index];

					utils.sendFile(fs, fileData.path + fileData.fileName, response);
				} else response.send({success: false, error: 'File doesn\'t exist'});
			}).catch(err => {
				response.status(500).send({success: false, error: 'Couldn\'t get the JSON file'});
				console.err(err);
			});
		});
	}
}