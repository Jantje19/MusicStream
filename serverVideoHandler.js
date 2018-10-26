module.exports = {
	start: (app, dirname, fileHandler, fs, os, settings, utils, querystring, ffmpeg) => {
		app.get('/video/:offset', (request, response) => {
			const url = querystring.unescape(request.url);
			console.log(utils.logDate() + ' Got a request for ' + url);

			if (!url.endsWith('/')) {
				fileHandler.getJSON(fs, os, utils, settings).then(json => {
					const fileName = url.match(/(.+)\/(.+)$/)[2].trim();
					const inArray = findVideo(json.video.videos, fileName);

					if (inArray.val == true) {
						const video = inArray.video;
						const videoPath = video.path + video.fileName;

						response.sendFile(videoPath);
					} else response.send({error: `The video '${fileName}' was not found`, info: "The cached JSON file had no reference to this file"});
				}).catch(err => {
					console.error(err);
					response.send({error: "There was an error with getting the video", info: err});
				});
			} else {
				response.send({error: "No video found"});
			}

			/*
			*	Finds the video from the filename
			*
			*	@param {Array} files
			*		The fileHandler.getJSON video.videos Array
			*	@param {String} fileName
			*		The video file name
			*	@return {Object}
			*		@param {Boolean} val
			*			Stores if the video was found
			*		@param (Optional) {Object} video
			*			The video information
			*/
			function findVideo(files, fileName) {
				const keys = Object.keys(files);

				for (let j = 0; j < keys.length; j++) {
					for (let i = 0; i < files[keys[j]].length; i++) {
						if (files[keys[j]][i].fileName == fileName)
							return {val: true, video: files[keys[j]][i]};
					}
				}

				return {val: false};
			}
		});

		app.get('*subtitle*', (request, response) => {
			const url = querystring.unescape(request.url);
			const fileName = url.replace('/subtitle/', '');
			console.log(utils.logDate() + ' Got a request for ' + url);

			fileHandler.getJSON(fs, os, utils, settings).then(json => {
				// Get the index of the subtitle object
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