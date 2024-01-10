#!/bin/bash
exec &> /path/to/mylogfile.log
export PATH=~/.nvm/versions/node/v20.6.1/bin:$PATH

pgrep -f "fieldUpdater.js" > /dev/null

if [ $? != 0 ]; then
    echo "$(date) - App not running! Trying to start..."
    cd /home/u592321381/sandeepheadtail_node
    pm2 start fieldUpdater.js
    if [ $? == 0 ]; then
        echo "$(date) - App started successfully!"
    else
        echo "$(date) - Failed to start the app!"
    fi
fi

