#!/bin/bash

# Define the full path to the node executable
NODE_PATH=~/.nvm/versions/node/v20.6.1/bin/node

# Define the name of the process to check
PROCESS_NAME="update.js"

# Define the log file name
LOG_FILE_NAME="logfile.log"

# Check if the process is running
if pgrep -x "$PROCESS_NAME" >/dev/null; then
    echo "$PROCESS_NAME is already running."
else
    echo "$PROCESS_NAME is not running. Restarting..."

    # Navigate to the script's directory
    SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
    cd "$SCRIPT_DIR"

    # Restart your Node.js application using the full path to node
    $NODE_PATH update.js

    echo "Restarted $PROCESS_NAME."

    # Create the log file in the same directory
    LOG_FILE_PATH="$SCRIPT_DIR/$LOG_FILE_NAME"
    echo "Log file path: $LOG_FILE_PATH"
fi

