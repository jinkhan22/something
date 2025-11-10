#!/bin/bash

# Kill any running Electron processes
pkill -f "electron" || true
sleep 1

# Navigate to the project directory and start the app
cd /Users/jin/Desktop/report_parser/automotive-appraisal
npm start
