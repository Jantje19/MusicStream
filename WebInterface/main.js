let queueIndex = 0;

const queue = [];
const cssRules = [];
const audio = new Audio();

function getData() {
	return new Promise((resolve, reject) => {
		fetch('/data/').then(response => {
			response.json().then(json => {
				if (json.error) reject(json);
				else resolve(json);
			}).catch(err => reject(err));
		}).catch(err => reject(err));
	});
}

function updateQueue() {
	const queueElem = document.getElementById('queue');

	queueElem.innerHTML = '';
	queue.slice().reverse().forEach((object, key) => {
		queueElem.innerHTML += `<button class="song ${key}" onclick="playSong('${object}')">${object}</button><hr>`;
	});

	Array.prototype.slice.call(queueElem.querySelectorAll('button')).reverse().forEach((object, key) => {
		if (queueIndex == key) object.style.backgroundColor = 'green';
		else object.style.backgroundColor = 'transparent';
	});
}

function playSong(songName) {
	document.getElementById('songName').innerText = songName;
	audio.src = '/song/' + songName;
	audio.play();
	queue.push(songName);
	updateQueue();
	queueIndex++;
}

function updatePlayState(evt) {
	if (audio.src != '' && audio.src != undefined) {
		if (audio.paused == true) {
			document.getElementById('toggleBtn').querySelector('img').src = 'Assets/ic_play_arrow_white.svg';
		} else if (audio.paused == false) {
			document.getElementById('toggleBtn').querySelector('img').src = 'Assets/ic_pause_white.svg';
		} else {
			console.error('WUT?');
		}
	}
}

function songEnd(evt) {
	const audioSrc = decodeURI(audio.src).match(/(.+)\/(.+)$/)[2];

	if (queueIndex == queue.length - 1) {
		if (document.getElementById('repeat').getAttribute('activated')) queueIndex = 0;
	} else {
		console.log('Play next in line!');
		playSong(queue[1]);
	}
}

function load() {
	const songsElem = document.getElementById('songs');
	const seekBarElem = document.getElementById('seekBar');
	const playlistsElem = document.getElementById('playlists');

	document.getElementById('toggleBtn').addEventListener('click', evt => {
		if (audio.src != '' && audio.src != undefined) {
			if (audio.paused == true) {
				audio.play();
			} else if (audio.paused == false) {
				audio.pause();
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
				// updateCSS(Math.floor(audio.currentTime) + 's', Math.floor(audio.duration) + 's');
				updateCSS(Math.floor(audio.currentTime) + 's', Math.floor(audio.duration - audio.currentTime) + 's');
			});

	document.getElementById('repeat').addEventListener('click', evt => {
		const val = evt.target.getAttribute('activated');

		if (val) {
			evt.target.removeAttribute('activated');
		} else {
			evt.target.setAttribute('activated', ' ');
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
				playlistsElem.innerHTML += `<button class="listElem ${key}">${object}</button><hr>`;
			});
		} else playlistsElem.innerHTML = '<i>No playlists found</i>';
	}).catch(err => {
		console.error('Something went wrong', err);
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

window.onload = load;
audio.onended = songEnd;
audio.onplay = updatePlayState;
audio.onpause = updatePlayState;