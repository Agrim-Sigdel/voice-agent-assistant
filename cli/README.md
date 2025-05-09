# Voice Agent Assistant CLI

Command-line interface for controlling the Voice Agent Assistant components.

## Features

- Start and stop services (middleware, UI, JADE platform)
- Control Android devices via ADB
- Manage JADE agents
- Monitor system status

## Installation

### Quick Install

To install the CLI tool globally, run:

```bash
# From the cli directory
node install.js

# Or using npm directly
npm install -g .
```

### Manual Installation

If you prefer to install manually:

1. Clone the repository
2. Navigate to the `cli` directory
3. Run `npm install`
4. Link the package globally: `npm link`

## Usage

Once installed, you can use the CLI with the `voice-agent` command:

```bash
# Start all services
voice-agent start

# Stop all services
voice-agent stop

# Check status of all components
voice-agent status

# List connected Android devices
voice-agent devices

# Execute an ADB command
voice-agent adb -c "shell ls /sdcard"

# Capture a screenshot
voice-agent adb -s screenshot.png

# Start specific services
voice-agent service -s -m  # Start middleware only
voice-agent service -s -u  # Start UI only
voice-agent service -s -j  # Start JADE platform only

# Monitor system
voice-agent monitor
```

## Available Commands

- `start` - Start all services
- `stop` - Stop all services
- `status` - Show status of all components
- `devices` - List connected Android devices
- `service` - Manage services (middleware, UI, JADE)
- `adb` - Control Android devices via ADB
- `jade` - Manage JADE agents
- `monitor` - Monitor system status

## Requirements

- Node.js 12.0.0 or higher
- ADB (Android Debug Bridge) for Android device control
- JADE platform for agent management

## License

MIT

