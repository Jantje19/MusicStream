function loaded() {
	const button = document.createElement('button');

	button.id = 'castBtn';
	button.title = 'Cast song';
	button.innerHTML = '<img src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/26/Chromecast_cast_button_icon.svg/2000px-Chromecast_cast_button_icon.svg.png" style="width: 20px; height: 20px;">';

	button.setAttribute('activated', 'false');
	document.getElementById('right').appendChild(button);
}