# MusicStream
A NodeJS server and web client for streaming music (and videos) to your network

## Installation
### Installer

You can try the [(buggy) GUI installer](https://github.com/jantje19/MusicStream-Installer/) based on Electron.

### Windows install video

[![Installation video](https://i.ytimg.com/vi/Laqh05oIK4g/maxresdefault.jpg)](http://www.youtube.com/watch?v=UOG_lOcmQlo)

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

## Updating
By default MusicStream will check if there is a new version available (This can be turned off in the settings). It will only notify, not update.
In future there will be a automated update function included with MusicStream, but in the meantime you can use the [installer](https://github.com/jantje19/MusicStream-Installer/) or update manually.

### Manual updating
Updating MusicStream isn't very difficult, but it is a bit tedious.
Updating is almost the same as installing, but you have to copy the save files.
If you follow these steps, you should be fine.
1. Move/copy the save files to a different location for safekeeping. These are the files that are configured for your setup. Like the settings and playlist files. These include: *settings.js*, *playlists.json*, The *Plugins* folder and other config files that you may have added like the *https-config* file.
2. Delete the *MusicStream* folder.
3. Download the latest version from GitHub. The update message will tell you the URL for the latest version, but you can also go to [this URL](https://github.com/Jantje19/MusicStream/releases) and click on the most recent one.
4. Extract the downloaded *zip* file.
5. Move the save files back.
6. Edit the *settings.js* file to include the newest settings values (This is super important! MusicStream will crash if you don't)
7. Run `npm install && npm start` in a CLI.
8. Done! Enjoy the new version

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
	- Which device: server
- 404 Page:
	- What: elevator music from orangefreesounds.com & canvas.js (I created canvas.js)
	- When: on visit
	- Which: local device
- Update
	- What: checking for updates on GitHub
	- When: on start of MusicStream if enabled
	- Which: server and/or local device

## Crashes

It crashes, why?

1. Make sure you ran `npm install`.
2. Make sure that you've installed Node-ID3 version 0.0.10 or higher. You can update it with this command: `npm update node-id3`.
3. If you are editing tags, make sure that you have [FFMPEG](https://www.ffmpeg.org/download.html) installed.

My browser gives error messages or shows a weird page?

- Make sure that you are using the latest version of your browser. You can check if you have the latest version [here](https://updatemybrowser.org/). If you are using *Internet Explorer* you should switch to another browser ([Chrome](https://www.google.com/chrome/browser) or [Firefox](https://www.mozilla.org/firefox/), since they are independently updated of your OS).

Still not working? Add an [issue](https://github.com/Jantje19/MusicStream/issues).
