#!/bin/bash

# Update package lists and install dependencies
apt-get update
apt-get install -y wget ca-certificates curl unzip

# Define download URL and destination directory
DOWNLOAD_URL="https://www.googleapis.com/download/storage/v1/b/chromium-browser-snapshots/o/Linux_x64%2F1452111%2Fchrome-linux.zip?generation=1745622558646601&alt=media"
DEST_DIR="/opt/render/project/.chromium"

# Download Chromium
echo "Starting Chromium download..."
wget "$DOWNLOAD_URL" -O /opt/render/project/chrome-linux.zip

# Check if download was successful
if [ $? -eq 0 ]; then
  echo "Download finished, extracting..."
  unzip /opt/render/project/chrome-linux.zip -d "$DEST_DIR"

  # Check if extraction was successful
  if [ -f "$DEST_DIR/chrome-linux/chrome" ]; then
    echo "Chromium extracted successfully to $DEST_DIR/chrome-linux/chrome"
  else
    echo "Chromium extraction failed!"
    exit 1
  fi

  # Clean up the zip file after extraction
  rm /opt/render/project/chrome-linux.zip
else
  echo "Failed to download Chromium. Exiting..."
  exit 1
fi
