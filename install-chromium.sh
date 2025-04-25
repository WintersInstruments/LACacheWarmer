#!/bin/bash

# Update package lists and install dependencies
apt-get update
apt-get install -y wget ca-certificates curl unzip

# Set the version of Chromium
CHROMIUM_VERSION="chrome-linux"

# Download and extract Chromium
echo "Starting Chromium download..."
wget https://storage.googleapis.com/chromium-browser-snapshots/Windows/901912/chrome-linux.zip
echo "Download finished, extracting..."

unzip chrome-linux.zip -d /opt/render/project/.chromium/

# Check if extraction was successful
if [ -f "/opt/render/project/.chromium/chrome-linux/chrome" ]; then
  echo "Chromium extracted successfully to /opt/render/project/.chromium/chrome-linux/chrome"
else
  echo "Chromium extraction failed!"
fi

# Clean up the zip file
rm chrome-linux.zip
