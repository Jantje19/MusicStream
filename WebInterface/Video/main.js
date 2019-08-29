let video, int, videoSettingsElem, selectElem;

function load() {
	video = document.querySelector('video');
	const videosElem = document.getElementById('videos');
	const seekBarElem = document.getElementById('seekBar');
	const timeEndElem = document.getElementById('time-end');
	const timeStartElem = document.getElementById('time-start');
	const overflowMenuElem = document.getElementById('overflow-menu');
	const videoTimeJumpElem = document.getElementById('video-time-jump');

	videoSettingsElem = document.getElementById('video-settings');
	fetch('/data/', {credentials: 'same-origin'}).then(response => {
		response.json().then(json => {
			if (!json.error) {
				const keys = Object.keys(json.video.videos);
				const addVideosToDiv = (arr, containerElem, section) => {
					arr.forEach((object, key) => {
						const buttonElem = document.createElement('button');

						buttonElem.addEventListener('click', evt => vidClick(evt, object));
						buttonElem.classList.add('video', escape(section), key);
						buttonElem.addEventListener('dragstart', drag);
						buttonElem.setAttribute('draggable', true);
						buttonElem.innerText = object;

						containerElem.appendChild(buttonElem);
					});
				}

				// document.body.querySelector('button[func=toggleCollapseAll]').style.display = 'hidden'; If more do this!
				if (Object.keys(json.video.videos).length < 2)
					document.getElementById('overflow-btn').style.display = 'none';

				if (json.video.subtitles) {
					if (json.video.subtitles.length > 0) {
						selectElem = document.createElement('select');
						selectElem.addEventListener('change', evt => {
							const title = evt.currentTarget.value;

							if (title.length != 0 && title.length != '')
								setSubtitleTrack('/subtitle/' + title);
							else
								removeTracks(document.getElementsByTagName('video')[0]);

							toggleVideoSettingsWindow();
						});

						json.video.subtitles.unshift('Select subtitle');
						json.video.subtitles.forEach((object, key) => {
							const optionElem = document.createElement('option');

							if (key == 0) {
								optionElem.setAttribute('hidden', true);
								optionElem.setAttribute('disabled', true);
								optionElem.setAttribute('selected', true);
							}

							optionElem.value = object;
							optionElem.innerText = object;

							selectElem.appendChild(optionElem);
						});

						document.getElementById('captions').parentElement.appendChild(selectElem);
					}
				}

				videosElem.innerHTML = '';
				if (keys.length > 1) {
					keys.forEach((object, key) => {
						const titleButton = document.createElement('button');
						const containerDiv = document.createElement('div');
						const videoDiv = document.createElement('div');

						titleButton.innerHTML = `<span>${object}</span><div><button title="Add all to queue"><img src="/Assets/ic_playlist_add_white.svg"></button><img class="toggleArrow" src="/Assets/ic_keyboard_arrow_up_white.svg"></div>`;
						titleButton.onclick = evt => {
							if (evt.target.title == 'Add all to queue' || evt.target.parentElement.title == 'Add all to queue') {
								updateQueue(json.video.videos[object], true);
								/*enqueue(json.video.videos[object]);
								playVid(json.video.videos[object][0], true)*/
							} else {
								if (containerDiv.className.indexOf('closed') > -1)
									containerDiv.className = containerDiv.className.replace('closed', '');
								else
									containerDiv.className += 'closed';
							}
						}

						addVideosToDiv(json.video.videos[object], videoDiv, object);
						containerDiv.appendChild(titleButton);
						containerDiv.appendChild(videoDiv);
						videosElem.appendChild(containerDiv);
					});
				} else {
					const vids = json.video.videos[keys[0]];

					if (vids) {
						if (vids.length > 0)
							addVideosToDiv(vids, videosElem);
						else
							videosElem.innerHTML = '<b style="display: block; margin-top: 10%">No video files found...<b>';
					} else videosElem.innerHTML = '<b style="display: block; margin-top: 10%">No video files found...<b>';
				}
			} else videosElem.innerHTML = '<b style="display: block; margin-top: 10%">No video files found...<b>';
		});
	}).catch(err => {
		videosElem.innerHTML = `<div style="text-align: center; margin-top:10%;"><h3>Oh no</h3><br><br><p>There was an error: <b>${err}</b></p></div>`;
		console.error('An error occurred', err);
	});

	video.onended = videoEnd;
	video.onplay = updateInterface;
	video.onpause = updateInterface;
	video.onclick = togglePlayState;
	video.ondblclick = toggleFullScreen;

	video.addEventListener("playing", evt => {
		document.getElementById('loader').style.opacity = '1';

		if (video.readyState == 4)
			document.getElementById('loader').style.opacity = '0';
	});

	video.addEventListener('timeupdate', evt => {
		seekBarElem.value = (video.currentTime / video.duration) * 100;

		if (video.duration && video.duration !== Infinity) {
			timeStartElem.innerText = convertToReadableTime(Math.floor(video.currentTime));
			timeEndElem.innerText = `${convertToReadableTime(Math.floor(video.duration - video.currentTime))} - ${convertToReadableTime(Math.floor(video.duration))}`;
		} else if (video.duration === Infinity) {
			timeEndElem.innerText = '?s';
			timeStartElem.innerText = convertToReadableTime(Math.floor(video.currentTime));
		} else {
			timeEndElem.innerText = '0s';
			timeStartElem.innerText = convertToReadableTime(Math.floor(video.currentTime));
		}
	});

	seekBarElem.addEventListener('input', evt => {
		if (video.src != '' && video.src != undefined)
			video.currentTime = video.duration / (evt.target.max / evt.target.value)
	});

	videoSettingsElem.getElementsByTagName('button')[0].addEventListener('click', evt => {
		evt.currentTarget.parentElement.style.display = 'none';
	});

	Array.from(overflowMenuElem.getElementsByTagName('button')).forEach((object, key) => {
		object.addEventListener('click', evt => {
			if (evt.currentTarget.hasAttribute('func'))
				eval(evt.currentTarget.getAttribute('func') + '()');

			overflowMenuElem.style.display = 'none';
		});
	});

	document.getElementById('overflow-btn').addEventListener('click', evt => {
		if (overflowMenuElem.style.display == 'block')
			overflowMenuElem.style.display = 'none';
		else
			overflowMenuElem.style.display = 'block';
	});

	document.getElementById('add-all-queue-btn').addEventListener('click', evt => {
		updateQueue(Array.from(videosElem.querySelectorAll('.video')).map(val => {
			return val.innerText;
		}), true);
	});

	document.getElementById('vidSpeed').addEventListener('change', evt => {
		video.playbackRate = evt.currentTarget.value;
		toggleVideoSettingsWindow();
	});

	document.getElementById('captions').addEventListener('change', evt => {
		setSubtitleTrack(evt.target.files[0]);
		toggleVideoSettingsWindow();
	});

	document.getElementById('back').addEventListener('click', evt => {
		const currentUrl = window.location.href;

		window.history.back();
		setTimeout(() => {
			if (currentUrl === window.location.href)
				window.location.href = '/';
		}, 100);
	});

	document.getElementById('playPause').addEventListener('click', togglePlayState);
	document.getElementById('fullScreen').addEventListener('click', toggleFullScreen);

	document.addEventListener('fullscreenchange', checkFullScreen, false);
	document.addEventListener('msfullscreenchange', checkFullScreen, false);
	document.addEventListener('mozfullscreenchange', checkFullScreen, false);
	document.addEventListener('webkitfullscreenchange', checkFullScreen, false);

	document.getElementById('settings-toggle').addEventListener('click', toggleVideoSettingsWindow);

	document.addEventListener('keyup', evt => {
		const skipAmount = Number(settings.skipAmount.val) || 5;

		if (evt.key == 'ArrowRight')
			jumpVideoTime(skipAmount, videoTimeJumpElem);
		else if (evt.key == 'ArrowLeft')
			jumpVideoTime(-skipAmount, videoTimeJumpElem);
		else if (evt.key == 'Space')
			togglePlayState();
	});

	/* Handle Picture-in-Picture */
	(function () {
		const pipButtonElement = document.getElementById('pip-toggle');

		if ('pictureInPictureEnabled' in document) {
			if (document.pictureInPictureEnabled) {
				setPipButton();
				video.addEventListener('loadedmetadata', setPipButton);
				video.addEventListener('emptied', setPipButton);
			}
		}

		pipButtonElement.addEventListener('click', evt => {
			if (document.pictureInPictureElement === null)
				video.requestPictureInPicture().then(console.log).catch(console.error);
			else
				document.exitPictureInPicture().then(console.log).catch(console.error);
		});

		function setPipButton() {
			pipButtonElement.style.display = 'initial';
			pipButtonElement.disabled = (video.readyState === 0) ||
			!document.pictureInPictureEnabled ||
			video.disablePictureInPicture;
		}
	})();

	// Toggle controls (very experimental)
	(function() {
		const videoWrapperElem = document.getElementById('videoElem');
		const controlsElem = document.getElementById('controls');
		const mouseMoveFunc = evt => {
			clearTimeout(mouseTimer);
			mouseTimer = setTimeout(() => {
				if (!mouseOut)
					controlsElem.style.transform = '';
			}, 3000);
		}

		let mouseTimer, mouseOut = true;

		videoWrapperElem.addEventListener('mouseover', evt => {
			mouseOut = false;
			controlsElem.style.transform = 'translateY(0px)';
			window.onmousemove =  mouseMoveFunc;
		});

		videoWrapperElem.addEventListener('mouseout', evt => {
			mouseOut = true;
			controlsElem.style.transform = '';
			window.onmousemove = null;
		});
	})();

	// For plugins
	try {
		loaded();
	} catch (err) {}
}

function vidClick(evt, title) {
	if (evt.ctrlKey)
		enqueue(title);
	else
		playVid(title);
}

function checkFullScreen(evt) {
	if (isFullScreen())
		document.getElementById('fullScreen').querySelector('img').src = 'Assets/ic_fullscreen_exit_white.svg';
	else
		document.getElementById('fullScreen').querySelector('img').src = 'Assets/ic_fullscreen_white.svg';
}

function toggleFullScreen() {
	const elem = document.getElementById('player');
	const typePrefix = getFullScreenType(elem);

	if (isFullScreen()) {
		if (typePrefix.length < 1) document['exitFullscreen']();
		else document[typePrefix + 'ExitFullscreen']();
	} else {
		if (typePrefix.length < 1) elem['requestFullscreen']();
		else elem[typePrefix + 'RequestFullscreen']();
	}

	function getFullScreenType(elem) {
		if ('requestFullscreen' in elem) return '';
		if ('msRequestFullscreen' in elem) return 'ms';
		if ('mozRequestFullscreen' in elem) return 'moz';
		if ('webkitRequestFullscreen' in elem) return 'webkit';
	}
}

function isFullScreen() {
	return !((document.fullScreenElement !== undefined && document.fullScreenElement === null) ||
		(document.msFullscreenElement !== undefined && document.msFullscreenElement === null) ||
		(document.mozFullScreen !== undefined && !document.mozFullScreen) ||
		(document.webkitIsFullScreen !== undefined && !document.webkitIsFullScreen));
}

function togglePlayState() {
	if (video.src != '') {
		const stateBtn = document.getElementById('playPause');

		if (video.paused == true) {
			video.play();
			stateBtn.childNodes[0].src = 'Assets/ic_pause_white.svg';
		} else if (video.paused == false) {
			video.pause();
			stateBtn.childNodes[0].src = 'Assets/ic_play_arrow_white.svg';
		} else console.error('WUT?');
	}
}

function playVid(title = '', notQueueTop) {
	video.src = '/video/' + title;
	video.play();

	console.log(title);

	if (!notQueueTop)
		queueTop(title);

	document.title = 'Video Stream - ' + title.replace('-', '');

	clearInterval(int);
	document.getElementById('songName').innerText = title;
	document.getElementById('autoplay').style.display = 'none';
	document.getElementById('playPause').childNodes[0].src = 'Assets/ic_pause_white.svg'
}

function videoEnd(evt) {
	if (getQueue().length > queueIndex) {
		let i = 0;
		const time = Number(settings.autoplayTime.val) || 10;
		const timeElem = document.getElementById('autoplay-time');
		const textElem = document.getElementById('autoplay').querySelector('span');
		const updateTimeInterface = () => {
			if (i <= time) {
				textElem.innerText = `Autoplay in: ${time - i}s`;
				timeElem.style.transform = `scaleX(${1 - (i / time)})`;
			}

			if (i > time) {
				setTimeout(() => {
					nextQueueItem();
					clearInterval(int);
					document.getElementById('autoplay').style.display = 'none';
					textElem.innerText = `Autoplay in: ${time}s`;
					timeElem.style.transform = '';
					i = 0;
				}, 100); //1000?
			}

			i++;
		}

		document.getElementById('autoplay').style.display = 'flex';
		int = setInterval(updateTimeInterface, time * 500); // It just feels long
		updateTimeInterface();
	}
}

function updateInterface() {
	if (video.paused == true)
		document.getElementById('playPause').querySelector('img').src = 'Assets/ic_play_arrow_white.svg';
	else if (video.paused == false)
		document.getElementById('playPause').querySelector('img').src = 'Assets/ic_pause_white.svg';
	else
		console.error('WUT?');
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

function setSubtitleTrack(val) {
	const videoElem = document.getElementsByTagName('video')[0];
	let url = '';

	if (val instanceof File)
		url = window.URL.createObjectURL(file);
	else
		url = val;

	removeTracks(videoElem);
	addSubtitleTrack(url, videoElem);
}

function removeTracks(videoElem) {
	Array.from(videoElem.getElementsByTagName('track')).forEach((object, key) => {
		object.remove();
	});
}

function addSubtitleTrack(url, videoElem) {
	const trackElem = document.createElement('track');

	trackElem.src = url;
	trackElem.srclang = 'en';
	trackElem.kind = 'captions';
	trackElem.setAttribute('default', '');

	videoElem.appendChild(trackElem);
}

function toggleCollapseAll() {
	Array.prototype.most = function(val, greaterOrEqual) {
		const trueArr = [];
		const falseArr = [];

		this.forEach(obj => {
			if (obj == val)
				trueArr.push(obj);
			else
				falseArr.push(obj);
		});

		if (greaterOrEqual)
			return trueArr.length >= falseArr.length;
		else
			return trueArr.length > falseArr.length;
	}

	const elements = Array.from(document.querySelectorAll('#videos > div'));
	const setClass = elements.map(val => {
		return val.classList.contains('closed');
	}).most(true);

	elements.forEach((object, key) => {
		if (setClass)
			object.classList.remove('closed');
		else
			object.classList.add('closed');
	});
}

function toggleVideoSettingsWindow() {
	if (videoSettingsElem) {
		if (videoSettingsElem.style.display == 'block')
			videoSettingsElem.style.display = 'none';
		else
			videoSettingsElem.style.display = 'block';
	}
}

function jumpVideoTime(amount, parentElement) {
	amount = amount || 5;
	parentElement = parentElement || document.getElementById('videoTimeJumpElem');

	if (amount <= video.duration) {
		const elem = (amount > 0) ? parentElement.children[0] : parentElement.children[1];

		elem.animate([
			{opacity: 0},
			{opacity: 0.5},
			{opacity: 0.8},
			{opacity: 0}
			], {
				duration: 700,
				easing: 'ease-out'
			})

		return video.currentTime = video.currentTime + amount;
	}
}

function saveQueueToTmp() {
	const subtitleElem = videoElem.getElementsByTagName('track');
	const subtitle = (subtitleElem.length > 0) ? subtitleElem[0] : '';
	const data = {
		timeStamp: videoElem.currentTime || 0,
		queueIndex: queueIndex,
		subtitle: subtitle,
		queue: getQueue()
	};

	fetch('/saveQueue/video', {method: 'POST', body: JSON.stringify(data)}).then(data => {
		data.json().then(json => {
			if (!json.success)
				alert('Unable to save: ' + json.error);
		});
	}).catch(err => {
		console.error(err);
		alert('Unable to save queue');
	});
}

function getTmpSavedQueue() {
	fetch('/getSavedQueue/video').then(response => {
		response.json().then(json => {
			if (json.success) {
				const {data} = json;

				updateQueue(data.queue);
				queueIndex = data.queueIndex;
				video.currentTime = data.timeStamp;
				setSubtitleTrack('/subtitle/' + data.subtitle);
			} else alert('Request was unsuccessfull: ' + json.error);
		});
	}).catch(err => {
		console.error(err);
		alert('Unable to load saved queue: ' + err.error);
	});
}

document.addEventListener('DOMContentLoaded', load);