# MusicStream
A NodeJS server and web client for streaming music (and videos) to your network

![Mock-up](https://testsite-vic.000webhostapp.com/Gallery/Assets/Mockup.png)

[*More Images*](http://testsite-vic.ml/Gallery/)

## Installation
### Installer

You can [try the new (buggy) GUI installer](https://github.com/jantje19/MusicStream-Installer/) written in Electron.

### Windows install video

[![Install video](https://i.ytimg.com/vi/Laqh05oIK4g/maxresdefault.jpg)](http://www.youtube.com/watch?v=UOG_lOcmQlo)

### Manual Installation Steps
1. Install [Node.js](https://nodejs.org/en/download/package-manager/)
2. [Download](https://github.com/jantje19/MusicStream/releases/latest/) the latest release from GitHub
3. Extract the files into a folder and rename it to *MusicStream*
4. Within the *MusicStream* directory run: `npm install && npm start` in a CLI (On windows type `cmd` in the location bar to open a CLI in that folder)
5. In your browser go to: http://localhost:8000

### Running
Try the *universal_python_executer.py* if you have python installed.
Otherwise move into the folder of your platform and execute one of the files within that folder.
If both of these methods fail, run `npm start` in the *MusicaStream* directory in a CLI.

## Plugins
*MusicStream* supports plug-ins. See how it works [here](https://github.com/jantje19/MusicStream-Plugins/).
I've also created some plug-ins. They can be found [here](https://github.com/Jantje19/MusicStream-Plugins/tree/master/MyPlugins).

## Notes
The web-interface only works with browsers that have ES6 support. Almost all (up to date) modern browsers have this. If it doesn't work on your browser try to update it. See if you have the latest version of your browser [here](https://updatemybrowser.org/).

This program needs Node-ID3 version 0.0.10 or higher to work with images properly.

Manipulating files (adding/removing tags) requires the installation of [FFMPEG](https://www.ffmpeg.org/download.html). This is not required however.

Supported browsers with build numbers (I would hope):
- Edge: 14
- Chrome: 49
- Firefox: 52
- Safari: 10
- Opera: 44
- IOS (Safari): 9.3
- Android (Chrome): 57
- Android browser (WebView): 56

Internet Explorer won't work. (*but why would you use it anyway.*)

**You can still use it on old browsers. On the main page it will ask you to move to the old browsers page. It features a limited interface and features.**

**Only tested (and used) on Google Chrome Canary and Chrome on Android**

### Privacy
I am a huge fan of privacy, that's why I try to be as specific as I can describing how my programs handle data. All of the data *MusicStream* collects stays on your own device (it also saves me server costs =P).
Some third party APIs are used:
- LastFM:
	- What: artist name and song title
	- When: every time when a new songs gets started & when adding auto tags
	- Which: local device
- YouTube API
	- What: the YouTube URL
	- When: YouTube video is downloaded
	- Which: server
- makeitpersonal API (lyrics)
	- What: artist name and song title
	- When: the request lyrics button is pressed
	- Which device: local device
- 404 Page:
	- What: elevator music from orangefreesounds.com & canvas.js (I created canvas.js)
	- When: on visit
	- Which: local device

## Crashes

It crashes, why?

1. Make sure you ran `npm install`.
2. Make sure that you've installed Node-ID3 version 0.0.10 or higher. You can update it with this command: `npm update node-id3`.
3. If you are editing tags, make sure that you have [FFMPEG](https://www.ffmpeg.org/download.html) installed.

My browser gives error messages or shows a weird page?

- Make sure that you are using the latest version of your browser. You can check if you have the latest version [here](https://updatemybrowser.org/). If you are using *Internet Explorer* you should switch to another browser ([Chrome](https://www.google.com/chrome/browser) or [Firefox](https://www.mozilla.org/firefox/), since they are independently updated of your OS).

Still not working? Add an [issue](https://github.com/Jantje19/MusicStream/issues).