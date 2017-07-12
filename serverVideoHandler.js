module.exports = {
	start: (app, dirname, fileHandler, fs, os, audioFileExtensions, videoFileExtensions, utils, querystring) => {
		app.get('/video/*', (request, response) => {
			const url = querystring.unescape(request.url);
			console.log('Got a request for ' + url);

			if (!url.endsWith('/')) {
				fileHandler.getJSON(fs, os, audioFileExtensions, videoFileExtensions, utils).then(json => {
					const fileName = url.match(/(.+)\/(.+)$/)[2].trim();
					const inArray = findSong(json.video.videos, fileName);

					if (inArray.val == true) {
						const video = json.video.videos[inArray.index];
						response.sendFile(video.path + video.fileName);
					} else response.send({error: `The video '${fileName}' was not found`, info: "The cached JSON file had no reference to this file"});
				}).catch(err => response.send({error: "There was an error with getting the video", info: err}));
			} else {
				response.send({error: "No video found"});
			}

			function findSong(files, fileName) {
				for (let i = 0; i < files.length; i++) {
					if (files[i].fileName == fileName) return {val: true, index: i};
				}

				return {val: false, index: -1};
			}
		});
	}
}