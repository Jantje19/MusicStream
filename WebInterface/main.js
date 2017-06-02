const cssRules = [];
const audio = new Audio();

function getData() {
	return new Promise((resolve, reject) => {
		get('/data/').then(json => {
			if (json.error) reject(json);
			else resolve(json);
		}).catch(err => reject(err));
	});
}

function handlePlaylist(name) {
	get('/playlist/' + name).then(json => {
		queue.push(...json.songs);
		updateQueue();
	}).catch( err => {
		console.error('An error occurred', err);
	});
}

function get(url) {
	return new Promise((resolve, reject) => {
		fetch(url).then(response => {
			if (response.type === 'opaque') reject('Received a response, but it\'s opaque so can\'t examine it');
			else if (response.status !== 200) reject('Looks like there was a problem. Status Code: ' + response.status);
			else {
				response.json().then(json => {
					if (json.error) reject(json.info);
					else resolve(json);
				});
			}
		}).catch(err => reject(err));
	});
}

function updateCSS(newValBefore, newValAfter) {
	const addRule = function(sheet, selector, styles) {
		if (sheet.insertRule) return sheet.insertRule(selector + " {" + styles + "}", sheet.cssRules.length);
		if (sheet.addRule) return sheet.addRule(selector, styles);
	};

	if (cssRules.length > 0) {
		cssRules.forEach((object, key) => {
			const type = (key == 0) ? 'before' : 'after';
			const rule = document.styleSheets[0].rules[object];

			rule.style.content = `'${arguments[key]}' !important`;
			rule.style.cssText = `content: "${arguments[key]}" !important;`;
			rule.cssText = `#seekBar[type=range]::${type} { content: '${arguments[key]}' !important; }`;
			rule.selectorText = `#seekBar[type=range]::${type} { content: '${arguments[key]}' !important; }`;
		});
	} else {
		cssRules.push(addRule(document.styleSheets[0], "#seekBar[type=range]::before", `content: '${newValBefore}' !important`));
		cssRules.push(addRule(document.styleSheets[0], "#seekBar[type=range]::after", `content: '${newValAfter}' !important`));
	}
}

function load() {
	const songsElem = document.getElementById('songs');
	const seekBarElem = document.getElementById('seekBar');
	const playlistsElem = document.getElementById('playlists');

	document.getElementById('toggleBtn').addEventListener('click', evt => {
		if (audio.src != '' && audio.src != undefined) {
			if (audio.paused == true) {
				playSong();
			} else if (audio.paused == false) {
				pauseSong();
			} else {
				console.error('WUT?');
			}
		}
	});

	seekBar.addEventListener('input', evt => {
		if (audio.src != '' && audio.src != undefined)
			audio.currentTime = audio.duration / (evt.target.max / evt.target.value)
	});

	audio.addEventListener('timeupdate', evt => {
		seekBarElem.value = (audio.currentTime / audio.duration) * 100;

		if (audio.duration)
			updateCSS(Math.floor(audio.currentTime) + 's', Math.floor(audio.duration - audio.currentTime) + 's');
		else
			updateCSS(Math.floor(audio.currentTime) + 's', '0s');
	});

	document.getElementById('repeat').addEventListener('click', evt => {
		const val = evt.target.getAttribute('activated');

		if (val) {
			evt.target.removeAttribute('activated');
		} else {
			evt.target.setAttribute('activated', '');
		}
	});

	document.getElementById('shuffle').addEventListener('click', evt => {
		const val = evt.target.getAttribute('activated');

		if (val) {
			evt.target.removeAttribute('activated');
		} else {
			evt.target.setAttribute('activated', ' ');
		}
	});

	getData().then(json => {
		if (json.songs.length > 0) {
			json.songs.forEach((object, key) => {
				songsElem.innerHTML += `<button class="song ${key}" onclick="playSong('${object}')">${object}</button><hr>`;
			});
		} else songsElem.innerHTML = '<i>No songs</i>';

		if (json.playlists.length > 0) {
			json.playlists.forEach((object, key) => {
				playlistsElem.innerHTML += `<button class="listElem ${key}" onclick="handlePlaylist('${object}')">${object}</button><hr>`;
			});
		} else playlistsElem.innerHTML = '<i>No playlists found</i>';
	}).catch(err => {
		console.error('Something went wrong', err);
	});
}

window.onload = load;
audio.onended = next;
audio.onplay = updateInterface;
audio.onpause = updateInterface;