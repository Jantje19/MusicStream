#! /bin/bash

if [ -x "$(command -v node)" ]; then
	echo "Node is installed!"
	$(cd ../../ && npm start)
else
	echo "Node is not installed! Run: 'sudo apt-get install -y nodejs'"
	exit 1
fi
