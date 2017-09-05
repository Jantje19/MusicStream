#! /usr/bin/python

import os
import webbrowser
import subprocess

def runProcess(exe):
	p = subprocess.Popen(exe, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
	retcode = p.poll()
	line = p.stdout.readline()
	line = line.decode("utf-8")
	return line.split()

if (runProcess('node --version'.split())[0].startswith('v')):
	print("Node is installed! Starting server")
	print('You may have to press CTRL+R in the browser after you see "Server is running on port 8000" when you see an error')
	path = '/'.join(os.getcwd().replace('\\', '/').split('/')[:-1])
	webbrowser.open('http://localhost:8000')
	os.system('npm start --prefix "' + path + '"')
else:
	print("Node is not installed! Download it")
	print('Opening browser...')
	webbrowser.open('https://nodejs.org/en/download/')