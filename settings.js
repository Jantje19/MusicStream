module.exports = {
	"port": {
		"val": 8000,
		"type": "number",
		"desc": "The port the server runs on. If you don't know what this is, don't change it."
	},
	"collectMostListened": {
		"val": true,
		"type": "bool",
		"desc": "Store the songs you listened and how many times in a playlist."
	},
	"mostListenedPlaylistName": {
		"val": "MostListened",
		"type": "string",
		"desc": "The name of the playlist that stores the songs you listened and how many times."
	},
	"audioFileExtensions": {
		"val": [".mp3", ".m3a", ".wav", ".m4u"],
		"type": "mult",
		"desc": "The accepted audio file extensions."
	},
	"videoFileExtensions": {
		"val": [".mp4"],
		"type": "mult",
		"desc": "The accepted video file extensions."
	},
	"ignoredAudioFiles": {
		"val": [],
		"type": "mult",
		"desc": "Filter out audio files that appear in the /data/ request. The songs are still accessible through /song/ and via a playlist."
	},
	"ignoredVideoFiles": {
		"val": [],
		"type": "mult",
		"desc": "Filter out video files that appear in the /data/ request. The videos are still accessible through /video/."
	},
	"checkOsHomedirs": {
		"val": true,
		"type": "bool",
		"desc": "Check the OS home directorys /Music/ and /Videos/ for media files."
	},
	"mediaPaths": {
		"val": [],
		"type": "mult",
		"desc": "The paths the server should check for media files. {homedir} is replaced by the os.homedir."
	},
	"updateJsonOnStart": {
		"val": true,
		"type": "bool",
		"desc": "If true, it will first check the filesystem for songs and video's, then it will start the server."
	},
	"checkForUpdateOnStart": {
		"val": true,
		"type": "bool",
		"desc": "If true, it will first check the local version number against Githubs, if it finds a new version it will notify you, otherwise it will just start the server. This makes startup times slower."
	},
	"repeatDefaultOnAudio": {
		"val": false,
		"type": "bool",
		"desc": "The audio interface has a repeat button, should that be turned on by default on page load?"
	},
	"shuffleDefaultOnAudio": {
		"val": false,
		"type": "bool",
		"desc": "The audio interface has a shuffle button, should that be turned on by default on page load?"
	},
	"defaultVolume": {
		"val": 100,
		"type": "range",
		"desc": "The volume that defaults on page load."
	},
	"autoplayTime": {
		"val": 10,
		"type": "range",
		"desc": "The amount of time in seconds that has to pass for the next video to start playing."
	},
	"skipAmount": {
		"val": 5,
		"type": "range",
		"desc": "The amount of seconds that skip when you press the arrow keys on the videos page."
	},
	"audioDefaultSortType": {
		"val": "default",
		"type": "choise",
		"options": ["default", "newest", "oldest"],
		"desc": "The default sorting of songs in the audio player."
	},
	"url": {
		"val": "http://localhost:8000",
		"type": "string",
		"desc": "If you have a URL linked to your MusicStream server, fill it in here, so that the manifest.json can be set up correctly. Should be same origin as document (eg. http://localhost:8000)."
	}
}
