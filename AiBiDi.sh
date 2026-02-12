#!/bin/bash
cd "$(dirname "$0")"

if ! command -v node &> /dev/null; then
    echo "Node.js is missing and is required to run AiBiDi."
    exit 1
fi

if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

PORT_FILE="tmp/.port"
SERVER_RUNNING=0

# Check if server is already running
if [ -f "$PORT_FILE" ]; then
    PORT=$(cat "$PORT_FILE")
    # Test if port is actually listening
    if nc -z localhost "$PORT" 2>/dev/null || (echo >/dev/tcp/localhost/$PORT) 2>/dev/null; then
        SERVER_RUNNING=1
        echo "Server already running on port $PORT"
    fi
fi

if [ $SERVER_RUNNING -eq 0 ]; then
    # Start new server
    echo "Starting AiBiDi server..."
    node src/server.js --auto-shutdown &

    # Wait for port file to be created (max 5 seconds)
    counter=0
    while [ ! -f "$PORT_FILE" ] && [ $counter -lt 5 ]; do
        sleep 1
        counter=$((counter + 1))
    done

    if [ ! -f "$PORT_FILE" ]; then
        echo "Error: Server failed to start"
        exit 1
    fi

    PORT=$(cat "$PORT_FILE")
    echo "Server started on port $PORT"
fi

# Open browser
if [[ "$OSTYPE" == "darwin"* ]]; then
    open "http://localhost:$PORT"
else
    xdg-open "http://localhost:$PORT" 2>/dev/null || echo "Please open http://localhost:$PORT in your browser"
fi
