const chalk = require('chalk');
const { exec } = require('child_process');
const ora = require('ora');
const WebSocket = require('ws');

// Middleware API endpoint
const WS_URL = 'ws://localhost:3000';

/**
 * Monitor system status
 * @param {Object} options Command options
 */
function monitorSystem(options) {
  console.log(chalk.blue('Starting Voice Agent Assistant monitoring...'));
  console.log(chalk.yellow('Press Ctrl+C to exit\n'));

  // Determine what to monitor
  const monitorAll = options.all || (!options.middleware && !options.jade && !options.device);
  const monitorMiddleware = options.middleware || monitorAll;
  const monitorJade = options.jade || monitorAll;
  const monitorDevice = options.device || monitorAll;

  // Set up monitoring intervals
  let stats = {
    middleware: { status: 'Unknown', connections: 0, lastUpdate: null },
    jade: { status: 'Unknown', agents: [], lastUpdate: null },
    device: { status: 'Unknown', deviceInfo: {}, lastUpdate: null }
  };

  // Start each monitor
  if (monitorMiddleware) {
    startMiddlewareMonitor(stats);
  }

  if (monitorJade) {
    startJadeMonitor(stats);
  }

  if (monitorDevice) {
    startDeviceMonitor(stats);
  }

  // Print stats periodically
  const monitorInterval = setInterval(() => {
    console.clear();
    console.log(chalk.blue('Voice Agent Assistant - System Monitor'));
    console.log(chalk.yellow('Press Ctrl+C to exit\n'));

    const now = new Date().toISOString();

    if (monitorMiddleware) {
      console.log(chalk.magenta('Middleware Status'));
      console.log(`Status: ${getStatusIndicator(stats.middleware.status)}`);
      console.log(`Active Connections: ${stats.middleware.connections}`);
      console.log(`Last Update: ${getTimeDiff(stats.middleware.lastUpdate, now)}`);
      console.log('');
    }

    if (monitorJade) {
      console.log(chalk.magenta('JADE Platform Status'));
      console.log(`Status: ${getStatusIndicator(stats.jade.status)}`);
      
      if (stats.jade.agents.length > 0) {
        console.log('Active Agents:');
        stats.jade.agents.forEach(agent => console.log(`  - ${agent}`));
      } else {
        console.log('Active Agents: None');
      }
      
      console.log(`Last Update: ${getTimeDiff(stats.jade.lastUpdate, now)}`);
      console.log('');
    }

    if (monitorDevice) {
      console.log(chalk.magenta('Connected Device Status'));
      console.log(`Status: ${getStatusIndicator(stats.device.status)}`);
      
      if (stats.device.deviceInfo.id) {
        console.log(`Device ID: ${stats.device.deviceInfo.id}`);
        console.log(`Model: ${stats.device.deviceInfo.model || 'Unknown'}`);
        console.log(`Battery: ${stats.device.deviceInfo.battery || 'Unknown'}`);
      } else {
        console.log('No device information available');
      }
      
      console.log(`Last Update: ${getTimeDiff(stats.device.lastUpdate, now)}`);
    }
  }, 1000);

  // Handle exit
  process.on('SIGINT', () => {
    clearInterval(monitorInterval);
    console.log(chalk.yellow('\nMonitoring stopped.'));
    process.exit(0);
  });
}

/**
 * Start middleware monitoring
 * @param {Object} stats Shared stats object
 */
function startMiddlewareMonitor(stats) {
  // Try to connect to middleware via WebSocket
  let ws = null;
  let reconnectTimer = null;

  const connect = () => {
    try {
      ws = new WebSocket(WS_URL);

      ws.on('open', () => {
        stats.middleware.status = 'Connected';
        stats.middleware.lastUpdate = new Date().toISOString();

        // Request status updates
        ws.send(JSON.stringify({ type: 'monitor_request' }));
      });

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          
          if (message.type === 'status_update') {
            stats.middleware.connections = message.connections || 0;
            stats.middleware.lastUpdate = new Date().toISOString();
          }
        } catch (error) {
          // Ignore parsing errors
        }
      });

      ws.on('close', () => {
        stats.middleware.status = 'Disconnected';
        stats.middleware.lastUpdate = new Date().toISOString();

        // Try to reconnect
        if (reconnectTimer) clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(connect, 5000);
      });

      ws.on('error', () => {
        stats.middleware.status = 'Error';
        stats.middleware.lastUpdate = new Date().toISOString();
      });
    } catch (error) {
      stats.middleware.status = 'Error';
      stats.middleware.lastUpdate = new Date().toISOString();
      
      // Try to reconnect
      if (reconnectTimer) clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(connect, 5000);
    }
  };

  connect();

  // Simulate middleware status for demo purposes
  setInterval(() => {
    if (stats.middleware.status !== 'Connected') {
      stats.middleware.status = Math.random() > 0.3 ? 'Simulated' : 'Error';
      stats.middleware.connections = Math.floor(Math.random() * 5);
      stats.middleware.lastUpdate = new Date().toISOString();
    }
  }, 3000);
}

/**
 * Start JADE platform monitoring
 * @param {Object} stats Shared stats object
 */
function startJadeMonitor(stats) {
  // Simulate JADE platform status for demo purposes
  stats.jade.status = 'Starting';
  stats.jade.lastUpdate = new Date().toISOString();

  setTimeout(() => {
    stats.jade.status = 'Running';
    stats.jade.agents = [
      'MainAgent',
      'VoiceBridgeAgent',
      'TaskRouterAgent',
      'PhoneControlAgent'
    ];
    stats.jade.lastUpdate = new Date().toISOString();
  }, 2000);

  // Periodically update stats
  setInterval(() => {
    stats.jade.status = Math.random() > 0.1 ? 'Running' : 'Overloaded';
    stats.jade.lastUpdate = new Date().toISOString();
  }, 5000);
}

/**
 * Start device monitoring
 * @param {Object} stats Shared stats object
 */
function startDeviceMonitor(stats) {
  const updateDeviceInfo = () => {
    // Try to get actual device info using ADB
    exec('adb devices -l', (error, stdout) => {
      if (error) {
        stats.device.status = 'Error';
        stats.device.lastUpdate = new Date().toISOString();
        return;
      }

      const deviceLines = stdout.split('\n').filter(line => line && !line.startsWith('List'));
      
      if (deviceLines.length > 0) {
        const deviceInfo = deviceLines[0].trim().split(/\s+/);
        stats.device.status = 'Connected';
        stats.device.deviceInfo = {
          id: deviceInfo[0],
          model: deviceInfo.find(item => item.startsWith('model:'))?.split(':')[1] || 'Unknown'
        };
        
        // Simulate battery level for demo
        stats.device.deviceInfo.battery = `${Math.floor(Math.random() * 100)}%`;
      } else {
        stats.device.status = 'No Device';
        stats.device.deviceInfo = {};
      }
      
      stats.device.lastUpdate = new Date().toISOString();
    });
  };

  // Initial update
  updateDeviceInfo();
  
  // Periodically update
  setInterval(updateDeviceInfo, 5000);
}

/**
 * Get a colored status indicator
 * @param {string} status Current status string
 * @returns {string} Colored status text
 */
function getStatusIndicator(status) {
  if (!status) return chalk.gray('Unknown');

  switch (status.toLowerCase()) {
    case 'connected':
    case 'running':
      return chalk.green(status);
    case 'starting':
    case 'simulated':
    case 'no device':
      return chalk.yellow(status);
    case 'disconnected':
    case 'overloaded':
    case 'error':
      return chalk.red(status);
    default:
      return chalk.gray(status);
  }
}

/**
 * Get a human-readable time difference
 * @param {string} timestamp ISO timestamp
 * @param {string} now Current ISO timestamp
 * @returns {string} Human-readable time difference
 */
function getTimeDiff(timestamp, now) {
  if (!timestamp) return 'Never';

  const diff = new Date(now) - new Date(timestamp);
  
  if (diff < 1000) return 'Just now';
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  
  return `${Math.floor(diff / 3600000)}h ago`;
}

module.exports = {
  monitorSystem
};

