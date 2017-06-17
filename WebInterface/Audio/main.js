let data;
let clickTimer;

const cssRules = [];
const audio = new Audio();

function getData() {
	return new Promise((resolve, reject) => {
		get('/data/').then(json => {
			if (json.error) reject(json);
			else resolve(json.audio);
		}).catch(err => reject(err));
	});
}

function handlePlaylist(evt, name) {
	if (evt.ctrlKey) {
		if (!name.match(/(.+)\.((\w+|[0-9]+){2,5})$/))
			window.location = '/managePlaylist.html#' + name;
	} else {
		get('/playlist/' + name).then(json => {
			if (document.getElementById('shuffle')) json.songs.shuffle();
			deleteQueue();
			queueIndex = 0;
			enqueue(...json.songs);
			playSong(queue[0], true);
		}).catch( err => {
			console.error('An error occurred', err);
		});
	}
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

function queueClick(evt, index) {
	if (evt.ctrlKey) {
		queue.splice(index, 1);
		if (audio.paused || (!audio.paused && index != queueIndex)) updateInterface();
		else playSong(null, true);
	} else {
		queueIndex = Number(index);
		playSong(null, true);
	}
}

function songClick(elem) {
	const object = elem.innerText;

	if (clickTimer) {
		clearTimeout(clickTimer);
		clickTimer = null;
		queueIndex = queue.length;
		enqueue(object);
		playSong(object, true);
	} else {
		clickTimer = setTimeout(() => {
			clickTimer = null;
			enqueue(object);
		}, 200);
	}
}

function addWholeSongsToQueue() {
	const buttons = document.getElementById('songs').querySelectorAll('button');

	if (document.getElementById('shuffle').getAttribute('activated') != null) Array.from(buttons).shuffle();

	buttons.forEach((object, key) => {
		enqueue(object.innerText);
	});
}

function moveQueueItem(oldIndex, newIndex) {
	queue.move(oldIndex, newIndex);
	updateInterface();
}

function saveQueueToPlaylist() {
	const playlistName = prompt('What should the eplaylist name be?').trim();

	if (playlistName != '') {
		if (queue.length > 1) {
			if (confirm('Are you sure the playlist is okay like this?')) {
				const jsonData = {name: playlistName, songs: queue};

				fetch('/updatePlaylist/', {method: "POST", body: JSON.stringify(jsonData)}).then(response => {
					response.json().then(json => {
						if (json.success) {
							if (json.error) alert('Something on the server went wrong.\n' + json.info);
							else if (json.data.toLowerCase().startsWith('playlist with the name ')) {
								alert(json.data);
							} else alert('Something went wrong', json.data);
						} else alert(json.info);
					});
				}).catch( err => {
					console.error('An error occurred', err);
				});
			}
		} else alert('The playlist is to short. We cannot accept that :/');
	} else alert('Your playlist name is empty');
}

function convertToReadableTime(int) {
	let outp = '';
	let hours   = Math.floor(int / 3600);
	let minutes = Math.floor((int - (hours * 3600)) / 60);
	let seconds = int - (hours * 3600) - (minutes * 60);

	if (hours < 10) hours = "0"+hours;
	if (minutes < 10) minutes = "0"+minutes;
	if (seconds < 10) seconds = "0"+seconds;
	if (hours > 0) outp += hours + ':';

	outp += minutes + ':';
	outp += seconds;

	return outp;
}

function updateCSS(newValBefore, newValAfter) {
	const addRule = function(sheet, selector, styles) {
		if (sheet.insertRule) return sheet.insertRule(selector + " {" + styles + "}", sheet.cssRules.length);
		if (sheet.addRule) return sheet.addRule(selector, styles);
	};

	if (cssRules.length > 0) {
		cssRules.forEach((object, key) => {
			let rule;
			const styleSheet = document.styleSheets[0];
			const type = (key == 0) ? 'before' : 'after';

			if ('rules' in styleSheet) rule = styleSheet.rules[object];
			else if ('cssRules' in styleSheet) rule = styleSheet.cssRules[object];
			else return;

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
		if (queue.length > 0) {
			if (audio.paused == true) {
				if (audio.src != '' && audio.src != undefined) {
					if (audio.paused == true) {
						audio.play();
						document.getElementById('toggleBtn').querySelector('img').src = 'Assets/ic_play_arrow_white.svg';
					} else if (audio.paused == false) {
						audio.pause();
						document.getElementById('toggleBtn').querySelector('img').src = 'Assets/ic_pause_white.svg';
					} else {
						console.error('WUT?');
					}
				} else playSong(null, true);
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
			updateCSS(convertToReadableTime(Math.floor(audio.currentTime)), convertToReadableTime(Math.floor(audio.duration - audio.currentTime)));
		else
			updateCSS(convertToReadableTime(Math.floor(audio.currentTime)), '0s');
	});

	document.getElementById('repeat').addEventListener('click', evt => {
		const val = evt.target.getAttribute('activated');

		if (val != null) {
			const img = evt.target.querySelector('img');
			const repeatOne = evt.target.getAttribute('repeatOne');

			if (repeatOne != null) {
				img.src = 'Assets/ic_repeat_white.svg';
				evt.target.removeAttribute('repeatOne');
				evt.target.removeAttribute('activated');
			} else {
				evt.target.setAttribute('repeatOne', '');
				img.src = 'Assets/ic_repeat_one_white.svg';
			}
		} else {
			evt.target.setAttribute('activated', '');
		}
	});

	document.getElementById('shuffle').addEventListener('click', evt => {
		const val = evt.target.getAttribute('activated');

		if (val != null) {
			evt.target.removeAttribute('activated');
		} else {
			queue.shuffle();
			playSong(null, true);
			evt.target.setAttribute('activated', '');
		}
	});

	document.getElementById('searchBtn').addEventListener('click', evt => {
		const searchBar = document.getElementById('searchBar');
		const searchInp = document.getElementById('searchInp');

		if (searchBar.style.display == 'inline-block') {
			searchInp.blur();
			searchInp.value = '';
			searchBar.style.display = 'none';
		} else {
			searchBar.style.display = 'inline-block';
			searchInp.focus();
		}
	});

	document.getElementById('searchInp').addEventListener('keyup', evt => {
		const string = evt.target.value;

		const songArr = searchArr(string, data.songs);
		const playlistArr = searchArr(string, data.playlists);

		songsElem.innerHTML = '';
		playlistsElem.innerHTML = '';

		songArr.forEach((object, key) => {
			songsElem.innerHTML += `<button class="song ${key}" onclick="songClick(this)">${object}</button><hr>`;
		});

		playlistArr.forEach((object, key) => {
			playlistsElem.innerHTML += `<button class="listElem ${key}" onclick="handlePlaylist(event, '${object}')">${object}</button><hr>`;
		});

		function searchArr(query, array) {
			const outp = [];

			for (let i = 0; i < array.length; i++) {
				const item = array[i];
				if (item.toString().toLowerCase().indexOf(query.toString().toLowerCase()) > -1) outp.push(item);
			}

			return outp;
		}
	});

	document.getElementById('showData').addEventListener('click', evt => {
		const controlsElem = document.getElementById('controls');
		const elem = evt.currentTarget;

		if (elem.getAttribute('activated') != null) {
			if (elem.className.indexOf('active') > -1) {
				elem.className = elem.className.replace('active', '');
				controlsElem.style.height = '';
			} else {
				elem.className += 'active';
				controlsElem.style.height = '230px';
			}
		}
	});

	document.getElementById('volumeToggle').addEventListener('click', evt => {
		const popUp = document.getElementById('volumePopUp');

		if (popUp.style.display == 'block') popUp.style.display = 'none';
		else popUp.style.display = 'block';
	});

	document.getElementById('muteBtn').addEventListener('click', evt => {
		audio.volume = 0;
		document.getElementById('volumeSlider').value = 0;
		document.getElementById('volumePopUp').style.display = 'none';
	});

	document.getElementById('volumeSlider').addEventListener('change', evt => {
		audio.volume = Number(evt.target.value) / 100;
	});

	getData().then(json => {
		data = json;

		if (json.songs.length > 0) {
			songsElem.innerHTML = '';
			json.songs.forEach((object, key) => {
				songsElem.innerHTML += `<button title="${object}" class="song ${key}" onclick="songClick(this)">${object}</button><hr>`;
			});
		} else songsElem.innerHTML = '<i>No songs</i>';

		if (json.playlists.length > 0) {
			json.playlists.forEach((object, key) => {
				playlistsElem.innerHTML += `<button title="${object}" class="listElem ${key}" onclick="handlePlaylist(event, '${object}')">${object}</button><hr>`;
			});
		} else playlistsElem.innerHTML = '<i>No playlists found</i>';
	}).catch(err => {
		console.error('Something went wrong', err);
	});
}

Array.prototype.shuffle = function() {
	let randomIndex;
	let currentIndex = this.length;

	while (0 !== currentIndex) {
		randomIndex = Math.floor(Math.random() * currentIndex);
		currentIndex--;

		const temporaryValue = this[currentIndex];
		this[currentIndex] = this[randomIndex];
		this[randomIndex] = temporaryValue;
	}

	return this;
}

Array.prototype.move = function (old_index, new_index) {
	if (new_index >= this.length) {
		var k = new_index - this.length;
		while ((k--) + 1) {
			this.push(undefined);
		}
	}
	this.splice(new_index, 0, this.splice(old_index, 1)[0]);
	return this;
};

window.onload = load;

audio.onended = end;
audio.onplay = updateInterface;
audio.onpause = updateInterface;