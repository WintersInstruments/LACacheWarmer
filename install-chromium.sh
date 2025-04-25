#!/bin/bash

# Update package lists and install dependencies
apt-get update
apt-get install -y wget ca-certificates curl unzip

# Set the version of Chromium
CHROMIUM_VERSION="chrome-linux"

# Download and extract Chromium
wget https://storage.googleapis.com/chromium-browser-snapshots/Windows/901912/chrome-linux.zip
unzip chrome-linux.zip -d /opt/render/project/.chromium/

# Clean up the zip file
rm chrome-linux.zip
