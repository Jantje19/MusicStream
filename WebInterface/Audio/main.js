let data;
let clickTimer;
let listenTime = 0;

const audio = new Audio();

const keyShortcuts = {
	"enter": keyPress,
	"space": keyPress,
	"escape": stopSong,
	"arrowright": next,
	"arrowleft": previous,
	"q": evt => {
		document.getElementById('queue').querySelectorAll('button')[queueIndex].scrollIntoView();
	}
}

function keyPress() {
	if (audio.src != null) {
		if (audio.paused)
			startSong();
		else
			pauseSong();
	} else playSong(null, true);
}

function getData(type) {
	if (!navigator.onLine)
		return window.sw.funcs.getDownloaded();

	return new Promise((resolve, reject) => {
		get('/data/' + ((type !== null && type !== undefined) ? '?sort=' + type : ''))
			.then(json => {
				if (json.error)
					reject(json.error);
				else {
					data = json.audio;
					resolve(json.audio);
				}
			}).catch(err => {
				console.error(err);
				window.sw.funcs.getDownloaded()
					.then(resolve)
					.catch(reject);
			});
	});
}

function handlePlaylist(evt, name) {
	if (evt.ctrlKey) {
		if (!name.match(/(.+)\.((\w+|[0-9]+){2,5})$/))
			window.location = '/managePlaylist.html#' + name;
	} else {
		get('/playlist/' + name).then(json => {
			if (document.getElementById('shuffle').getAttribute('activated') == 'true')
				json.songs.shuffle();

			deleteQueue();
			enqueue(...json.songs);
			playSong(queue[0], true);
		}).catch(err => {
			console.error('An error occurred', err);
		});
	}
}

function get(url, headers) {
	if (!headers)
		headers = {};

	headers.credentials = 'same-origin';
	return new Promise((resolve, reject) => {
		fetch(url, headers).then(response => {
			if (response.type === 'opaque')
				reject('Received a response, but it\'s opaque so can\'t examine it');
			else if (response.status !== 200 && response.status !== 301)
				reject('Looks like there was a problem. Status Code: ' + response.status);
			else {
				response.json().then(json => {
					if (json.error)
						reject(json.error);
					else
						resolve(json);
				});
			}
		}).catch(reject);
	});
}

function queueClick(evt, index) {
	if (evt.ctrlKey) {
		queue.splice(index, 1);
		if (audio.paused || (!audio.paused && index != queueIndex))
			updateInterface();
		else
			playSong(null, true);
	} else {
		updateQueueIndex(Number(index));
		playSong(null, true);
	}
}

function songClick(evt) {
	const elem = evt.target;

	if (evt.ctrlKey) {
		if (queue.length < 1) {
			enqueue(elem.innerText);
		} else {
			enqueue(elem.innerText);
			moveQueueItem(queue.length - 1, queueIndex + 1);
		}
	} else {
		const object = elem.innerText;

		if (clickTimer) {
			clearTimeout(clickTimer);
			clickTimer = null;
			updateQueueIndex(queue.length);
			enqueue(object);
			playSong(object, true);
		} else {
			clickTimer = setTimeout(() => {
				clickTimer = null;
				enqueue(object);
			}, 200);
		}
	}
}

function addWholeSongsToQueue() {
	const buttons = document.getElementById('songs').querySelectorAll('button');

	if (document.getElementById('shuffle').getAttribute('activated') == 'true')
		Array.from(buttons).shuffle();

	buttons.forEach((object, key) => {
		enqueue(object.innerText);
	});
}

function moveQueueItem(oldIndex, newIndex) {
	queue.move(oldIndex, newIndex);
	updateInterface();
}

function handleSaveMenuClick(type) {
	try {
		if (type == 'playlist')
			saveQueueToPlaylist();
		else
			saveQueueToTmp(type);
	} catch (err) {
		console.error(err);
	}

	document.getElementById('saveMenu').style.display = 'none';
}

function saveQueueToTmp(type) {
	const data = {
		timeStamp: audio.currentTime || 0,
		queueIndex: queueIndex,
		queue: queue
	};

	if (type == 'global')
		data.for = 'global'

	get('saveQueue/audio', {
		body: JSON.stringify(data),
		method: 'post',
		headers: {
			'Content-Type': 'application/json'
		}
	}).then(data => {
		console.log(data);
	}).catch(err => {
		console.error(err);
		alert('Unable to save queue')
	});
}

function saveQueueToPlaylist() {
	if (queue.length > 1) {
		const playlistName = prompt('What should the eplaylist name be?').trim();

		if (playlistName.length > 0 && playlistName !== "") {
			if (confirm('Are you sure the playlist is okay like this?')) {
				const jsonData = { name: playlistName, songs: queue };

				get('/updatePlaylist/', {
					body: JSON.stringify(jsonData),
					credentials: 'include',
					method: "POST",
					headers: {
						'Content-Type': 'application/json'
					}
				}).then(json => {
					if (json.success) {
						if (json.error)
							alert('Something on the server went wrong');
						else if (json.data.toLowerCase().startsWith('playlist with the name '))
							window.location.reload();
						else
							alert('Something went wrong', json.data);
					} else alert(json.error);
				}).catch(err => {
					console.error('An error occurred', err);
				});
			}
		} else alert('Your playlist name is empty');
	} else alert('The playlist is too short.');
}

function getTmpSavedQueue(type, autoHandleResponse) {
	const getTmpSaveQueue = type => {
		return new Promise((resolve, reject) => {
			get('getSavedQueue/audio?for=' + type).then(data => {
				if (data.success) {
					if (data.data.queue) {
						if (data.data.queue.length > 0) {
							resolve(data.data);
							return;
						}
					}

					reject('No queue data found');
				} else reject(data.error);
			}).catch(reject);
		});
	}

	if (!type)
		type = 'ip';

	if (autoHandleResponse) {
		const tmpBtnArr = Array.from(document.querySelectorAll('.tmpBtn'));

		tmpBtnArr.forEach(btn => {
			btn.disabled = true;
		});

		getTmpSaveQueue(type).then(data => {
			document.getElementById('queue').innerHTML = '';
			queueIndex = data.queueIndex;
			audio.src = '/song/' + data.queue[data.queueIndex];
			enqueue(data.queue);
			updateInterface();
			audio.currentTime = data.timeStamp;
		}).catch(err => {
			console.error('Get TMP queue', err);
			alert('Unable to get temporary saved queue: ' + err);

			tmpBtnArr.forEach(btn => {
				btn.disabled = false;
			});
		});
	} else return getTmpSaveQueue(type);
}

function sharePlaylist() {
	const url = `${window.location.origin}?queue=${queue.join(',')}`;
	const desktopShare = skipClipboardAPI => {
		skipClipboardAPI = (skipClipboardAPI == true) ? true : false;

		if (navigator.clipboard && !skipClipboardAPI) {
			navigator.clipboard.writeText(url).then(() => {
				console.log('Text copied to clipboard');
			}).catch(err => {
				console.error('Could not copy text: ', err);
				desktopShare(true);
			});
		} else {
			let inpElem = document.getElementById('copyTextElem');

			if (!inpElem) {
				inpElem = document.createElement('input');
				inpElem.style.pointerEvents = 'none';
				inpElem.style.opacity = '0';
				inpElem.id = 'copyTextElem';
				inpElem.type = 'text';

				document.body.appendChild(inpElem);
			}

			inpElem.value = url;
			inpElem.select();

			if (document.execCommand('Copy'))
				alert('Successfully copied URL to clipboard');
			else
				alert(inpElem.value)

			inpElem.blur();
		}
	}

	if (navigator.share) {
		navigator.share({
			title: 'MusicStream queue',
			url: url
		}).then(() => {
			console.log('Successful share')
		}).catch(err => {
			console.log('Error sharing', err);

			if (confirm('Do you want to copy the URL?'))
				desktopShare();
		});
	} else desktopShare();
}

function convertToReadableTime(int) {
	let outp = '';
	let hours = Math.floor(int / 3600);
	let minutes = Math.floor((int - (hours * 3600)) / 60);
	let seconds = int - (hours * 3600) - (minutes * 60);

	if (hours < 10) hours = "0" + hours;
	if (minutes < 10) minutes = "0" + minutes;
	if (seconds < 10) seconds = "0" + seconds;
	if (hours > 0) outp += hours + ':';

	outp += minutes + ':';
	outp += seconds;

	return outp;
}

function updateCSS(seekBar, newValBefore, newValAfter) {
	seekBar.setAttribute('start', newValBefore);
	seekBar.setAttribute('end', newValAfter);
}

function reloadSongslist(selectElem, playlistsElem) {
	const val = ('target' in selectElem) ? selectElem.target.value : selectElem.value;
	const songsElem = document.getElementById('songs');
	let after;

	if (val != "none")
		after = val;

	songsElem.innerHTML = '<div class="ball-scale-multiple"><div></div><div></div><div></div></div>';
	return new Promise((resolve) => {
		getData(after).then(data => {
			updateSongInterface(data, songsElem, playlistsElem);
		}).catch(err => {
			songsElem.innerHTML = `<div style="text-align: center"><h3>Oh no</h3><br><br><p>There was an error: <b>${err}</b></p></div>`;
			console.error('Something went wrong', err);
		}).finally(resolve);
	});
}

function updateSongInterface(json, songsElem, playlistsElem) {
	if (json.songs.length > 0) {
		checkQueueStore(json.songs);
		document.getElementById('songCount').innerText = "Amount: " + json.songs.length;
		songsElem.innerHTML = '';

		const containerElem = songsElem.cloneNode();
		json.songs.forEach((object, key) => {
			const buttonElem = document.createElement('button');

			buttonElem.classList.add('listElem', 'song', key);
			buttonElem.addEventListener('click', songClick);
			buttonElem.innerText = object;
			buttonElem.title = object;

			containerElem.appendChild(buttonElem);
		});
		songsElem.replaceWith(containerElem);

		updateInterface();
	} else songsElem.innerHTML = '<i>No songs found</i>';

	if (playlistsElem) {
		if (json.playlists.length > 0) {
			document.getElementById('playlistCount').innerText = "Amount: " + json.playlists.length;
			const containerElem = playlistsElem.cloneNode();

			json.playlists.forEach((object, key) => {
				const buttonElem = document.createElement('button');

				buttonElem.addEventListener('click', evt => handlePlaylist(evt, object));
				buttonElem.classList.add('listElem', key);
				buttonElem.innerText = object;
				buttonElem.title = object;

				containerElem.appendChild(buttonElem);
			});

			playlistsElem.replaceWith(containerElem);
		} else playlistsElem.innerHTML = '<i>No playlists found</i>';
	}
}

function toastHelper(message, extraInfo) {
	const toast = window.sw.funcs
		.displayToast(message, extraInfo)
		.getToast();

	toast
		.addButton('Ok')
		.addEventListener('click', () => {
			toast.dismiss();
		}, { passive: true });
}

function contextMenuClick(elem, func) {
	const innerText = elem.parentElement.getAttribute('innerText');

	if (elem.parentElement.id === 'songContextMenu') {
		if (func === 'playNext')
			songClick({ ctrlKey: true, target: { innerText } });
		else if (func === 'editTags')
			window.location = '/editTags.html#' + encodeURIComponent(innerText)
		else if (func === 'removeDownload')
			window.sw.funcs
				.removeDownload(innerText)
				.then(success => {
					if (!success)
						throw Error();
					else {
						Array.from(document.getElementById('songs').children)
							.find(elem => elem.innerText === innerText)
							.removeAttribute('downloaded');

						toastHelper(`Successfully removed '${innerText}' from cache`);
					}
				})
				.catch(err => {
					console.error(err);
					toastHelper(`An error occured when removing '${innerText}' from cache`, err.message);
				});
	} else if (elem.parentElement.id === 'playlistContextMenu') {
		if (func === 'edit')
			handlePlaylist({ ctrlKey: true }, innerText);
		else if (func === 'downloadPlaylist') {
			get('/playlist/' + innerText)
				.then(data => {
					if (data.success) {
						const url = new URL(window.location);

						url.pathname = '/offlineDownload.html';
						url.searchParams.append('songs', encodeURIComponent(JSON.stringify(data.songs)));
						url.searchParams.append('playlist', encodeURIComponent(innerText));

						window.location = url;
					} else
						throw Error(data.error);
				})
				.catch(err => {
					console.error(err);
					toastHelper('An error occured while fetching the playlist contents', err.message);
				});
		}
	} else if (elem.parentElement.id === 'queueContextMenu') {
		if (func === 'remove')
			queueClick({ ctrlKey: true }, queue.indexOf(innerText));
	}
}

function load([swFuncs]) {
	const overflowMenuBtn = document.getElementById('overflowMenuHolder').querySelector('button');
	const overflowMenu = document.getElementById('overflowMenu');
	const playlistsElem = document.getElementById('playlists');
	const searchInp = document.getElementById('searchInp');
	const seekBarElem = document.getElementById('seekBar');
	const sortElem = document.getElementById('sort');

	if (swFuncs) {
		document.getElementById('offlineDownload')
			.style.display = 'block';
	}

	if ('mediaSession' in navigator) {
		navigator.mediaSession.setActionHandler('nexttrack', next);
		navigator.mediaSession.setActionHandler('previoustrack', previous);
		navigator.mediaSession.setActionHandler('pause', evt => pauseSong(null, true));
		navigator.mediaSession.setActionHandler('play', evt => {
			if (audio.src != null) {
				if (audio.paused) startSong();
				else pauseSong();
			} else playSong(null, true);
		});

		navigator.mediaSession.setActionHandler('seekbackward', function () {
			audio.currentTime -= 5;
		});

		navigator.mediaSession.setActionHandler('seekforward', function () {
			audio.currentTime += 5;
		});
	}

	reloadSongslist(sortElem, playlistsElem)
		.then(async () => {
			if (swFuncs) {
				Array.from(document.getElementsByClassName('downloadAvailable'))
					.forEach(elem => {
						elem.style.display = 'block';
					});

				const downloaded = await swFuncs.getDownloaded();

				Array.from(document.getElementById('songs').children)
					.forEach(elem => {
						if (downloaded.songs.includes(elem.innerText))
							elem.setAttribute('downloaded', '');
					});
				Array.from(document.getElementById('playlists').children).forEach(elem => {
					if (downloaded.playlists.includes(elem.innerText))
						elem.setAttribute('downloaded', '');
				});
			}
		});

	if (!navigator.onLine) {
		const btn = document.querySelector('#overflowMenuHolder > button');

		btn.style.opacity = 0.5;
		btn.disabled = true;
	}

	document.getElementById('toggleBtn').addEventListener('click', evt => {
		if (queue.length > 0) {
			if (audio.paused == true) {
				if (audio.src != '' && audio.src != undefined) {
					if (audio.paused == true) {
						audio.play();
						document.getElementById('toggleBtn').querySelector('img').src = '/Assets/ic_play_arrow_white.svg';
					} else if (audio.paused == false) {
						audio.pause();
						document.getElementById('toggleBtn').querySelector('img').src = '/Assets/ic_pause_white.svg';
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
	}, { passive: true });

	seekBar.addEventListener('input', evt => {
		if (audio.src != '' && audio.src != undefined)
			audio.currentTime = audio.duration / (evt.target.max / evt.target.value)
	}, { passive: true });

	audio.addEventListener('timeupdate', evt => {
		listenTime++;
		seekBarElem.value = (audio.currentTime / audio.duration) * 100;

		if (audio.duration && audio.duration !== Infinity)
			updateCSS(seekBarElem, convertToReadableTime(Math.floor(audio.currentTime)), convertToReadableTime(Math.floor(audio.duration - audio.currentTime)));
		else if (audio.duration === Infinity)
			updateCSS(seekBarElem, convertToReadableTime(Math.floor(audio.currentTime)), '?s');
		else
			updateCSS(seekBarElem, convertToReadableTime(Math.floor(audio.currentTime)), '0s');
	});

	document.getElementById('repeat').addEventListener('click', evt => {
		const val = evt.target.getAttribute('activated');

		if (val == 'true') {
			const img = evt.target.querySelector('img');
			const repeatOne = evt.target.getAttribute('repeatOne');

			if (repeatOne != null) {
				img.src = 'Assets/ic_repeat_white.svg';
				evt.target.removeAttribute('repeatOne');
				evt.target.setAttribute('activated', false);
			} else {
				evt.target.setAttribute('repeatOne', '');
				img.src = 'Assets/ic_repeat_one_white.svg';
			}
		} else {
			evt.target.setAttribute('activated', true);
		}
	}, { passive: true });

	document.getElementById('shuffle').addEventListener('click', evt => {
		const val = evt.target.getAttribute('activated');

		if (val == 'true')
			evt.target.setAttribute('activated', false);
		else {
			if (queueIndex > 0) {
				const queueCopy = queue.slice();

				queue.length = 0;
				queue.push(queueCopy.splice(queueIndex, 1)[0]);
				queueIndex = 0;
				enqueue(queueCopy.shuffle());
			} else {
				queue.shuffle();
				playSong(null, true);
			}

			updateCookies();
			evt.target.setAttribute('activated', true);
		}
	}, { passive: true });

	document.getElementById('searchBtn').addEventListener('click', evt => {
		if (searchInp.style.display == 'block') {
			searchInp.blur();
			searchInp.value = '';
			searchInp.style.display = 'none';
		} else {
			searchInp.style.display = 'block';
			searchInp.focus();
		}
	}, { passive: true });

	Array.from(overflowMenu.querySelectorAll('a')).forEach((object, key) => {
		object.addEventListener('click', evt => {
			evt.currentTarget.parentElement.style.display = 'none';
		});
	});

	overflowMenuBtn.addEventListener('click', evt => {
		if (overflowMenu.style.display == 'block')
			overflowMenu.style.display = 'none';
		else
			overflowMenu.style.display = 'block';
	}, { passive: true });

	searchInp.addEventListener('keyup', evt => {
		const string = evt.target.value.trim().toLowerCase();

		const playlistsElem = document.getElementById('playlists');
		const songsElem = document.getElementById('songs');

		const playlistArr = data.playlists.filter(val => {
			return val.toLowerCase().includes(string);
		});
		const songArr = data.songs.filter(val => {
			return val.toLowerCase().includes(string);
		});

		playlistsElem.innerHTML = '';
		songsElem.innerHTML = '';

		songArr.forEach((object, key) => {
			const buttonElem = document.createElement('button');

			buttonElem.classList.add('listElem', 'song', key);
			buttonElem.addEventListener('click', songClick);
			buttonElem.innerText = object;
			buttonElem.title = object;

			songsElem.appendChild(buttonElem);
		});

		playlistArr.forEach((object, key) => {
			const buttonElem = document.createElement('button');

			buttonElem.addEventListener('click', evt => handlePlaylist(evt, object));
			buttonElem.classList.add('listElem', key);
			buttonElem.innerText = object;
			buttonElem.title = object;

			playlistsElem.appendChild(buttonElem);
		});

		document.getElementById('songCount').innerText = "Amount: " + songArr.length;
		document.getElementById('playlistCount').innerText = "Amount: " + playlistArr.length;
	}, { passive: true });

	document.getElementById('showData').addEventListener('click', evt => {
		const controlsElem = document.getElementById('controls');
		const elem = evt.currentTarget;

		if (elem.getAttribute('activated') == 'true') {
			if (elem.className.indexOf('active') > -1) {
				elem.className = elem.className.replace('active', '');
				controlsElem.style.height = '';
			} else {
				elem.className += 'active';
				controlsElem.style.height = '230px';
			}
		}
	}, { passive: true });

	document.getElementById('volumeToggle').addEventListener('click', evt => {
		const popUp = document.getElementById('volumePopUp');

		if (document.getElementById('showData').className.indexOf('active') > -1)
			popUp.style.transform = 'translateY(-170px)';

		if (popUp.style.display == 'block')
			popUp.style.display = 'none';
		else
			popUp.style.display = 'block';
	}, { passive: true });

	document.getElementById('muteBtn').addEventListener('click', evt => {
		setVolume(0, document.getElementById('volumeToggle'));
		document.getElementById('volumeSlider').value = 0;
		document.getElementById('volumePopUp').style.display = 'none';
	}, { passive: true });

	document.getElementById('updateJSONBtn').addEventListener('click', evt => {
		overflowMenu.style.display = 'none';

		get('/updateJSON/', { method: 'POST', credentials: 'include' }).then(json => {
			if (json.success) {
				if (confirm('Updated media list!\nShould the songs list be updated?'))
					reloadSongslist(sortElem);
			} else alert(json.info);
		}).catch(err => {
			console.error('An error occurred', JSON.parse(err));
		});
	}, { passive: true });

	document.getElementById('volumeSlider').addEventListener('change', evt => {
		setVolume(Number(evt.target.value) / 100, document.getElementById('volumeToggle'));
	}, { passive: true });

	document.getElementById('saveMenu').addEventListener('click', evt => {
		if (evt.target == evt.currentTarget)
			evt.currentTarget.style.display = 'none';
	}, { passive: true });

	document.getElementById('sort').addEventListener('change', reloadSongslist, { passive: true });

	// Shortcuts
	window.addEventListener('keyup', evt => {
		const key = evt.code.toLowerCase();
		if (key in keyShortcuts) {
			if (document.activeElement.tagName.toLowerCase() != 'input') {
				evt.preventDefault();
				keyShortcuts[key](evt);
				return false;
			} else return true;
		}

		return true;
	}, { passive: true });

	const playlistContextMenu = document.getElementById('playlistContextMenu');
	const queueContextMenu = document.getElementById('queueContextMenu');
	const songContextMenu = document.getElementById('songContextMenu');
	document.addEventListener('contextmenu', evt => {
		const elem = document.elementFromPoint(evt.x, evt.y);
		const parentId = elem.parentElement.id;
		if (parentId === 'songs' || parentId === 'playlists' || parentId === 'queue') {
			evt.preventDefault();

			playlistContextMenu.style.display = 'none';
			queueContextMenu.style.display = 'none';
			songContextMenu.style.display = 'none';

			let menu = songContextMenu;

			if (parentId === 'queue')
				menu = queueContextMenu;
			else if (parentId === 'playlists') {
				menu = playlistContextMenu;

				if (elem.hasAttribute('downloaded'))
					menu.children[menu.children.length - 1].style.display = 'none';
			} else if (parentId === 'songs') {
				if (elem.hasAttribute('downloaded')) {
					// Make 'removeDownload' visible
					menu.children[menu.children.length - 1].style.display = 'block';
				}
			}

			menu.setAttribute('innerText', evt.target.innerText);

			menu.style.top = evt.y + 1 + 'px';
			menu.style.left = evt.x + 'px';
			menu.style.display = 'block';
		}
	});
	document.addEventListener('click', evt => {
		playlistContextMenu.style.display = 'none';
		queueContextMenu.style.display = 'none';
		songContextMenu.style.display = 'none';
	}, { passive: true });

	// Mobile page
	(function () {
		const cookies = getCookieAttributes();

		if ('use-desktop' in cookies && cookies['use-desktop'].toLowerCase() === 'true') {
			const buttonElem = document.createElement('button');

			buttonElem.innerText = 'Mobile site';
			buttonElem.addEventListener('click', evt => {
				document.cookie = 'use-desktop=false; expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Strict;';
				window.location.href = '/mobile/';
			}, { passive: true });

			overflowMenu.appendChild(document.createElement('hr'));
			overflowMenu.appendChild(buttonElem);
		}
	})();

	if (!navigator.onLine)
		overflowMenuBtn.setAttribute('disabled', true);
}

Array.prototype.shuffle = function () {
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

function getCookieAttributes() {
	const outp = {};

	decodeURIComponent(document.cookie).split(';').forEach(object => {
		const splitVal = object.trim().split('=');

		if (splitVal.length > 2) {
			for (let i = 2; i < splitVal.length; i++)
				splitVal[1] += '=' + splitVal[i];
		}

		outp[splitVal[0]] = unescape(splitVal[1]);
	});

	return outp;
}

function checkQueueStore(songsArr) {
	function getLocationAttributes() {
		const json = {};

		if (window.location.search) {
			for (const [key, value] of new URLSearchParams(window.location.search))
				json[key] = value;
		}

		return json;
	}

	async function getQueueStore() {
		const [storedQueueIndex, queue] = await Promise.all([
			localforage.getItem('queueIndex'),
			localforage.getItem('queue')
		]);

		if (storedQueueIndex !== null && queue !== null) {
			try {
				queueIndex = parseInt(storedQueueIndex, 10);
				JSON.parse(queue).forEach((item) => {
					if (songsArr.includes(item))
						enqueue(item);
				});
			} catch (err) {
				console.error(err);
			}
		}
	}

	const locationAtts = getLocationAttributes();
	if (locationAtts) {
		// Remove the search parameters
		window.history.replaceState({}, document.title, "/");

		if ('queue' in locationAtts) {
			const arr = locationAtts['queue'].split(',').filter(val => {
				return songsArr.includes(val);
			});

			if (arr.length > 0) {
				arr.forEach(object => {
					queue.push(object);
				});

				playSong(queue[queueIndex], true);

				return;
			}
		}
	}

	getQueueStore().catch(console.error);
}

audio.onended = end;
audio.onplay = updateInterface;
audio.onpause = updateInterface;

(function () {
	const promiseArr = [];

	// Service worker
	// Only load the handler file if the browser actually supports service workers
	if ('serviceWorker' in navigator) {
		promiseArr.push(new Promise((resolve, reject) => {
			const script = document.createElement('script');

			script.src = 'ServiceWorker/serviceworkerHandler.js';
			script.type = 'module';
			script.onload = () => {
				window.sw
					.then(funcs => {
						window.sw.funcs = funcs;
						resolve(funcs);
					})
					.catch(reject);
			}

			document.head.appendChild(script);
		}));
	}

	promiseArr.push(new Promise(resolve => {
		document.addEventListener('DOMContentLoaded', resolve);
	}));

	Promise.all(promiseArr).then(load).catch(err => {
		console.error(err);
		load([]);
	});
})();