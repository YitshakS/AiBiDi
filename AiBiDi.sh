#!/bin/bash
cd "$(dirname "$0")"

if ! command -v node &> /dev/null; then
    while true; do
        read -p "Node.js is missing and required to run AiBiDi. Install it now? (y/n): " INSTALL_NODE
        if [[ "${INSTALL_NODE,,}" == "y" ]]; then
            break
        elif [[ "${INSTALL_NODE,,}" == "n" ]]; then
            echo "Node.js is required to run AiBiDi. Exiting."
            exit 1
        fi
    done
    echo "Installing Node.js..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install node
    elif [[ -f /etc/debian_version ]]; then
        sudo apt-get update && sudo apt-get install -y nodejs npm
    elif [[ -f /etc/redhat-release ]]; then
        sudo dnf install -y nodejs
    else
        echo "Unsupported system. Please install Node.js manually from https://nodejs.org"
        exit 1
    fi
    if ! command -v node &> /dev/null; then
        echo "Installation failed. Please install Node.js manually from https://nodejs.org"
        exit 1
    fi
    echo "Node.js installed successfully."
fi

if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
    echo ""
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
    nohup node src/server.js --auto-shutdown &
    disown

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
echo "Opening browser at http://localhost:$PORT"
if [[ "$OSTYPE" == "darwin"* ]]; then
    open "http://localhost:$PORT"
else
    xdg-open "http://localhost:$PORT" 2>/dev/null || echo "Please open http://localhost:$PORT in your browser"
fi
