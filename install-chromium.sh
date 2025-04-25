#!/bin/bash

# Update package lists and install dependencies
apt-get update
apt-get install -y wget ca-certificates curl unzip

# Set the version of Chromium
CHROMIUM_VERSION="901912" # You can change this to the version you need

# Download and extract Chromium for Linux
wget https://storage.googleapis.com/chromium-browser-snapshots/Linux/$CHROMIUM_VERSION/chrome-linux.zip -O /tmp/chrome-linux.zip

# Unzip the downloaded file into the correct directory
unzip /tmp/chrome-linux.zip -d /opt/render/project/.chromium/

# Clean up the zip file
rm /tmp/chrome-linux.zip
