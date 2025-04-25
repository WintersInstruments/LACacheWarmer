#!/bin/bash

# Update package lists and install dependencies
apt-get update
apt-get install -y wget ca-certificates curl unzip

# Set the version of Chromium (adjust for the correct version)
CHROMIUM_VERSION="901912" # You can update this as needed to match the specific version you require

# Download and extract Chromium for Linux (using the Linux version)
wget https://storage.googleapis.com/chromium-browser-snapshots/Windows/$CHROMIUM_VERSION/chrome-linux.zip

# Unzip the downloaded file into the correct directory
unzip chrome-linux.zip -d /opt/render/project/.chromium/

# Clean up the zip file
rm chrome-linux.zip
