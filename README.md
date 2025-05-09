# Voice Agent Assistant

A multi-component system for voice-controlled device management using JADE agent platform and ADB for Android device control.

## Project Overview

Voice Agent Assistant is a distributed system that enables voice command processing for controlling Android devices. The system uses a JADE (Java Agent DEvelopment Framework) multi-agent platform for distributed communication, a voice interface for user interaction, and ADB (Android Debug Bridge) for programmatic control of Android devices.

## Project Structure

The project consists of four main components:

### 1. ADB Controller

The ADB Controller component handles direct communication with Android devices through the Android Debug Bridge (ADB) protocol.

- `sendCommand.sh`: Shell script for sending ADB commands to connected devices

### 2. JADE Platform

The JADE Platform contains the multi-agent system responsible for processing commands and coordinating actions between system components.

- `jadeConfig/`: Configuration files for the JADE platform startup
- `src/agents/`: Java source files for various agent implementations
  - `MainAgent.java`: Entry point and coordination agent
  - `PhoneControlAgent.java`: Agent responsible for phone control operations
  - `TaskRouterAgent.java`: Agent for routing tasks to appropriate handlers
  - `VoiceBridgeAgent.java`: Agent for handling voice command translation
- `src/utils/`: Utility classes supporting agent operations
  - `CommandParser.java`: Parsing commands from various input sources

### 3. Middleware

The Middleware component provides RESTful API endpoints and manages the communication between the voice UI and the JADE platform.

- `routes/`: API route definitions
  - `voiceCommandRoute.js`: Handles voice command API endpoints
- `server.js`: Express.js server implementation

### 4. Voice UI

The Voice UI component provides a web-based user interface for voice input and system interaction.

- `index.html`: Main HTML page for the voice interface
- `script.js`: JavaScript for voice recognition and UI interactions
- `style.css`: CSS styling for the web interface

## Requirements

### System Requirements

- JDK 11 or higher for the JADE platform
- Node.js 14.x or higher for middleware
- Android SDK with ADB tools installed and configured
- Modern web browser supporting Speech Recognition API
- Connected Android device(s) or emulator(s) with USB debugging enabled

### Dependencies

- **JADE Platform**:
  - JADE Framework 4.5.0 or higher
  - JSON processing libraries

- **Middleware**:
  - Express.js
  - Body-parser
  - CORS
  - WebSocket

- **Voice UI**:
  - Web Speech API
  - Fetch API

## Setup Instructions

### 1. ADB Controller Setup

1. Ensure Android SDK is installed with ADB tools available
2. Connect Android device via USB and enable USB debugging in developer options
3. Verify connection with `adb devices` command
4. Make the shell script executable:
   ```bash
   chmod +x adb-controller/sendCommand.sh
   ```

### 2. JADE Platform Setup

1. Install JDK 11 or higher
2. Download and set up JADE libraries
3. Compile Java sources:
   ```bash
   javac -cp .:jade/lib/jade.jar jade-platform/src/agents/*.java jade-platform/src/utils/*.java
   ```
4. Start the JADE platform with Main-Container:
   ```bash
   java -cp .:jade/lib/jade.jar jade.Boot -gui -agents "main:jade-platform.src.agents.MainAgent"
   ```

### 3. Middleware Setup

1. Install Node.js and npm
2. Navigate to the middleware directory
3. Install dependencies:
   ```bash
   cd middleware
   npm install
   ```
4. Configure any environment variables in a `.env` file
5. Start the server:
   ```bash
   node server.js
   ```

### 4. Voice UI Setup

1. The Voice UI can be served through the middleware or any web server
2. If using a separate web server, configure CORS appropriately
3. Open the index.html in a browser with microphone permissions

## Usage Instructions

1. Start all components in the following order:
   - JADE Platform
   - ADB Controller (ensure device is connected)
   - Middleware
   - Open Voice UI in browser

2. Allow microphone access when prompted in the browser

3. Click on the microphone button to start voice recognition

4. Speak commands clearly, such as:
   - "Open Camera app"
   - "Send text message to [contact]"
   - "Take a screenshot"

5. The system will process your command through:
   - Voice UI → Middleware → JADE Platform → ADB Controller → Android Device

6. You can monitor agent activity in the JADE GUI interface

## Troubleshooting

- If ADB connection fails, ensure USB debugging is enabled and the device is authorized
- For voice recognition issues, check browser compatibility and microphone permissions
- JADE platform issues can be diagnosed using the GUI admin console

## License

See the [LICENSE](LICENSE) file for details.

