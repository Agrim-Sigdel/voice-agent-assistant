// Configuration
const API_URL = 'http://localhost:3000/api/voice';
const WS_URL = 'ws://localhost:3000';

// DOM Elements
const microphoneButton = document.getElementById('microphone-button');
const voiceVisualizer = document.getElementById('voice-visualizer');
const statusText = document.getElementById('status-text');
const statusLight = document.getElementById('status-light');
const commandText = document.getElementById('command-text');
const responseText = document.getElementById('response-text');
const deviceStatusText = document.getElementById('device-status-text');
const connectionStatus = document.getElementById('connection-status');
const toast = document.getElementById('toast');

// State
let isListening = false;
let recognition = null;
let ws = null;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;

// Initialize the application
document.addEventListener('DOMContentLoaded', init);

function init() {
    setupWebSpeechAPI();
    connectWebSocket();
    setupEventListeners();
    fetchAvailableCommands();
}

// Web Speech API Setup
function setupWebSpeechAPI() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        showToast('Speech recognition not supported in this browser. Try Chrome, Edge, or Safari.', 'error');
        microphoneButton.disabled = true;
        updateStatus('Speech recognition not supported', 'error');
        return;
    }

    // Create speech recognition instance
    recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    // Set up event handlers
    recognition.onstart = () => {
        isListening = true;
        updateStatus('Listening...', 'listening');
        microphoneButton.classList.add('listening');
        voiceVisualizer.classList.add('active');
    };

    recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
            .map(result => result[0].transcript)
            .join('');
        
        commandText.textContent = transcript;
        
        // If final result
        if (event.results[0].isFinal) {
            processCommand(transcript);
        }
    };

    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        isListening = false;
        updateStatus(`Error: ${event.error}`, 'error');
        microphoneButton.classList.remove('listening');
        voiceVisualizer.classList.remove('active');
        
        if (event.error === 'not-allowed') {
            showToast('Microphone access denied. Please allow microphone access.', 'error');
        }
    };

    recognition.onend = () => {
        isListening = false;
        microphoneButton.classList.remove('listening');
        voiceVisualizer.classList.remove('active');
        
        // Only update status if not processing
        if (statusText.textContent !== 'Processing...') {
            updateStatus('Ready', 'ready');
        }
    };
}

// WebSocket Connection
function connectWebSocket() {
    if (ws) {
        ws.close();
    }

    try {
        ws = new WebSocket(WS_URL);

        ws.onopen = () => {
            console.log('WebSocket connection established');
            connectionStatus.textContent = 'Connected';
            connectionStatus.classList.add('connected');
            reconnectAttempts = 0;
            
            // Check device status
            ws.send(JSON.stringify({ type: 'device_status_check' }));
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('WebSocket message received:', data);
                
                switch (data.type) {
                    case 'connection':
                        // Connection confirmation
                        showToast(data.message);
                        break;
                        
                    case 'command_received':
                        // Command acknowledgement
                        updateStatus('Processing...', 'processing');
                        break;
                        
                    case 'command_result':
                        // Display command result
                        responseText.textContent = data.response || 'Command executed';
                        updateStatus('Ready', 'ready');
                        break;
                        
                    case 'device_status':
                        // Update device status
                        deviceStatusText.textContent = data.connected 
                            ? `Connected: ${data.deviceName || 'Android Device'}` 
                            : 'No device connected';
                        break;
                        
                    case 'error':
                        // Handle error
                        responseText.textContent = `Error: ${data.message}`;
                        updateStatus('Error', 'error');
                        showToast(data.message, 'error');
                        break;
                        
                    default:
                        console.warn('Unknown message type:', data.type);
                }
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        };

        ws.onclose = () => {
            console.log('WebSocket connection closed');
            connectionStatus.textContent = 'Disconnected';
            connectionStatus.classList.remove('connected');
            
            // Attempt to reconnect
            if (reconnectAttempts < maxReconnectAttempts) {
                reconnectAttempts++;
                setTimeout(() => {
                    console.log(`Attempting to reconnect (${reconnectAttempts}/${maxReconnectAttempts})...`);
                    connectWebSocket();
                }, 3000);
            } else {
                showToast('Could not connect to server after multiple attempts. Please refresh the page.', 'error');
            }
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            connectionStatus.textContent = 'Connection Error';
        };
    } catch (error) {
        console.error('WebSocket connection error:', error);
        connectionStatus.textContent = 'Connection Error';
        
        // Attempt to reconnect
        if (reconnectAttempts < maxReconnectAttempts) {
            setTimeout(connectWebSocket, 3000);
            reconnectAttempts++;
        }
    }
}

// Process voice command
function processCommand(command) {
    if (!command || command.trim() === '') {
        return;
    }
    
    console.log('Processing command:', command);
    updateStatus('Processing...', 'processing');
    
    // Try WebSocket if available
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'voice_command',
            command: command
        }));
    } else {
        // Fallback to REST API
        sendCommandViaREST(command);
    }
}

// Send command via REST API (fallback)
async function sendCommandViaREST(command) {
    try {
        const response = await fetch(`${API_URL}/command`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ command })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            responseText.textContent = data.response?.agentResponse || 'Command sent successfully';
            
            if (data.directExecution && data.directExecution.output) {
                deviceStatusText.textContent = `Command executed: ${data.directExecution.output.substring(0, 100)}`;
            }
        } else {
            responseText.textContent = `Error: ${data.error?.message || 'Failed to process command'}`;
            updateStatus('Error', 'error');
            showToast(data.error?.message || 'Error processing command', 'error');
        }
    } catch (error) {
        console.error('Error sending command via REST:', error);
        responseText.textContent = `Error: ${error.message}`;
        updateStatus('Error', 'error');
        showToast('Network error. Please try again.', 'error');
    } finally {
        updateStatus('Ready', 'ready');
    }
}

// Fetch available commands from server
async function fetchAvailableCommands() {
    try {
        const response = await fetch(`${API_URL}/commands`);
        
        if (response.ok) {
            const data = await response.json();
            
            if (data.availableCommands && data.availableCommands.length > 0) {
                const commandsList = document.getElementById('available-commands');
                commandsList.innerHTML = '';
                
                data.availableCommands.forEach(cmd => {
                    const li = document.createElement('li');
                    li.innerHTML = `<strong>${cmd.command}</strong> - ${cmd.description}`;
                    commandsList.appendChild(li);
                });
            }
        }
    } catch (error) {
        console.error('Error fetching available commands:', error);
    }
}

// Set up event listeners
function setupEventListeners() {
    microphoneButton.addEventListener('click', () => {
        if (isListening) {
            recognition.stop();
        } else {
            // Clear previous results
            commandText.textContent = 'Listening...';
            responseText.textContent = 'Waiting for command...';
            
            recognition.start();
        }
    });
}

// Update status indicator
function updateStatus(message, type) {
    statusText.textContent = message;
    
    // Reset all classes
    statusLight.classList.remove('listening', 'processing', 'error');
    
    // Add appropriate class
    if (type) {
        statusLight.classList.add(type);
    }
}

// Show toast notification
function showToast(message, type = 'info') {
    // Clear any existing toast timeout
    if (toast.timeoutId) {
        clearTimeout(toast.timeoutId);
    }
    
    toast.textContent = message;
    toast.className = 'toast visible';
    
    if (type === 'error') {
        toast.style.backgroundColor = 'rgba(231, 76, 60, 0.9)';
    } else if (type === 'success') {
        toast.style.backgroundColor = 'rgba(46, 204, 113, 0.9)';
    } else {
        toast.style.backgroundColor = 'rgba(52, 73, 94, 0.9)';
    }
    
    // Auto-hide after 4 seconds
    toast.timeoutId = setTimeout(() => {
        toast.classList.remove('visible');
    }, 4000);
}

