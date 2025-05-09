const chalk = require('chalk');
const { exec, spawn } = require('child_process');
const ora = require('ora');
const path = require('path');
const fs = require('fs');
const http = require('http');

// Get the project root directory
const projectRoot = path.resolve(__dirname, '..', '..');

// Service configuration - Update ports if needed
const SERVICES = {
  middleware: {
    name: 'Middleware API',
    port: 3000,
    dir: path.join(projectRoot, 'middleware'),
    startCmd: 'node server.js',
    processNamePattern: 'node server.js',
    healthCheck: 'http://localhost:3000/'
  },
  ui: {
    name: 'Voice UI',
    port: 8080,
    dir: path.join(projectRoot, 'voice-ui'),
    startCmd: 'npx http-server -p 8080',
    processNamePattern: 'http-server.*voice-ui',
    healthCheck: 'http://localhost:8080/'
  },
  jade: {
    name: 'JADE Platform',
    port: null,  // JADE doesn't use a standard HTTP port
    dir: path.join(projectRoot, 'jade-platform'),
    startCmd: process.platform === 'win32' 
      ? 'java -cp "%JADE_HOME%\\lib\\jade.jar" jade.Boot -gui -agents "main:MainAgent"'
      : 'java -cp "${JADE_HOME}/lib/jade.jar" jade.Boot -gui -agents "main:MainAgent"',
    processNamePattern: 'java.*jade.Boot',
    healthCheck: null  // No direct HTTP health check for JADE
  }
};

/**
 * Start Voice Agent Assistant services
 * @param {Object} options Command options
 */
async function startServices(options) {
  const spinner = ora('Starting services...').start();
  
  // Determine which services to start
  const startMiddleware = options.middleware || (!options.ui && !options.jade);
  const startUi = options.ui || (!options.middleware && !options.jade);
  const startJade = options.jade || (!options.middleware && !options.ui);
  
  const services = [];
  
  if (startMiddleware) {
    services.push(SERVICES.middleware);
  }
  
  if (startUi) {
    services.push(SERVICES.ui);
  }
  
  if (startJade) {
    services.push(SERVICES.jade);
  }
  
  // Check if services are already running
  const status = await getServiceStatus();
  
  // Filter out already running services
  const servicesToStart = services.filter(service => {
    const isRunning = service === SERVICES.middleware ? status.middleware :
                     service === SERVICES.ui ? status.ui :
                     service === SERVICES.jade ? status.jade : false;
    
    if (isRunning) {
      console.log(chalk.yellow(`${service.name} is already running`));
      return false;
    }
    return true;
  });
  
  if (servicesToStart.length === 0) {
    spinner.info('All selected services are already running');
    return;
  }
  
  spinner.text = `Starting ${servicesToStart.length} service(s)...`;
  
  // Track started services
  let startedCount = 0;
  const startupPromises = [];
  
  // Start each service
  for (const service of servicesToStart) {
    startupPromises.push(startService(service, spinner)
      .then(() => {
        startedCount++;
        if (startedCount === servicesToStart.length) {
          spinner.succeed(`Started ${startedCount} service(s)`);
          services.forEach(s => {
            const isRunning = s === SERVICES.middleware ? status.middleware :
                             s === SERVICES.ui ? status.ui :
                             s === SERVICES.jade ? status.jade : false;
            
            if (!isRunning && servicesToStart.includes(s)) {
              console.log(chalk.green(`✓ ${s.name}`));
            }
          });
        }
      })
      .catch((error) => {
        spinner.fail(`Failed to start ${service.name}: ${error.message}`);
      })
    );
  }
  
  // Wait for all services to start or fail
  await Promise.allSettled(startupPromises);
  
  // Check final status
  if (startedCount < servicesToStart.length) {
    spinner.warn(`Started ${startedCount}/${servicesToStart.length} services`);
  }
}

/**
 * Stop Voice Agent Assistant services
 * @param {Object} options Command options
 */
async function stopServices(options) {
  const spinner = ora('Stopping services...').start();
  
  // Determine which services to stop
  const stopMiddleware = options.middleware || (!options.ui && !options.jade);
  const stopUi = options.ui || (!options.middleware && !options.jade);
  const stopJade = options.jade || (!options.middleware && !options.ui);
  
  // Check current status
  const status = await getServiceStatus();
  
  // Build kill commands based on platform
  const killCommands = [];
  
  if (stopMiddleware && status.middleware) {
    if (process.platform === 'win32') {
      killCommands.push(`taskkill /F /FI "WINDOWTITLE eq *${SERVICES.middleware.processNamePattern}*" /T`);
    } else {
      killCommands.push(`pkill -f "${SERVICES.middleware.processNamePattern}"`);
    }
  }
  
  if (stopUi && status.ui) {
    if (process.platform === 'win32') {
      killCommands.push(`taskkill /F /FI "WINDOWTITLE eq *${SERVICES.ui.processNamePattern}*" /T`);
    } else {
      killCommands.push(`pkill -f "${SERVICES.ui.processNamePattern}"`);
    }
  }
  
  if (stopJade && status.jade) {
    if (process.platform === 'win32') {
      killCommands.push(`taskkill /F /FI "WINDOWTITLE eq *${SERVICES.jade.processNamePattern}*" /T`);
    } else {
      killCommands.push(`pkill -f "${SERVICES.jade.processNamePattern}"`);
    }
  }
  
  if (killCommands.length === 0) {
    spinner.info('No running services to stop');
    return;
  }
  
  // Execute kill commands
  const killPromises = killCommands.map(cmd => {
    return new Promise((resolve) => {
      exec(cmd, (error) => {
        // We ignore errors since pkill exits with 1 if no processes were found
        resolve();
      });
    });
  });
  
  await Promise.all(killPromises);
  
  // Verify services stopped
  const newStatus = await getServiceStatus();
  const allStopped = (!stopMiddleware || !newStatus.middleware) &&
                     (!stopUi || !newStatus.ui) &&
                     (!stopJade || !newStatus.jade);
  
  if (allStopped) {
    spinner.succeed('Services stopped');
  } else {
    spinner.warn('Some services may still be running');
    
    if (stopMiddleware && newStatus.middleware) {
      console.log(chalk.yellow(`${SERVICES.middleware.name} is still running`));
    }
    
    if (stopUi && newStatus.ui) {
      console.log(chalk.yellow(`${SERVICES.ui.name} is still running`));
    }
    
    if (stopJade && newStatus.jade) {
      console.log(chalk.yellow(`${SERVICES.jade.name} is still running`));
    }
  }
}

/**
 * Get status of running services
 * @returns {Promise<Object>} Status of services
 */
async function getServiceStatus() {
  const status = {
    middleware: false,
    ui: false,
    jade: false
  };
  
  // Check middleware status
  if (SERVICES.middleware.port) {
    status.middleware = await isPortInUse(SERVICES.middleware.port);
  } else {
    status.middleware = await isProcessRunning(SERVICES.middleware.processNamePattern);
  }
  
  // Check UI status
  if (SERVICES.ui.port) {
    status.ui = await isPortInUse(SERVICES.ui.port);
  } else {
    status.ui = await isProcessRunning(SERVICES.ui.processNamePattern);
  }
  
  // Check JADE status
  status.jade = await isProcessRunning(SERVICES.jade.processNamePattern);
  
  return status;
}

/**
 * Start a service
 * @param {Object} service Service configuration
 * @param {Object} spinner Ora spinner for status updates
 * @returns {Promise<void>}
 */
function startService(service, spinner) {
  return new Promise((resolve, reject) => {
    spinner.text = `Starting ${service.name}...`;
    
    // Ensure service directory exists
    if (!fs.existsSync(service.dir)) {
      return reject(new Error(`Service directory not found: ${service.dir}`));
    }
    
    // Determine shell to use based on platform
    const shell = process.platform === 'win32' ? 'cmd' : 'bash';
    const shellFlag = process.platform === 'win32' ? '/c' : '-c';
    
    // Start the process
    const proc = spawn(shell, [shellFlag, service.startCmd], {
      cwd: service.dir,
      detached: true,
      stdio: 'pipe',
      windowsHide: true
    });
    
    // Listen for process errors
    proc.on('error', (error) => {
      reject(new Error(`Process error: ${error.message}`));
    });
    
    // Set a timeout for the health check
    const timeout = setTimeout(() => {
      if (service.healthCheck) {
        // For services with HTTP health checks
        checkServiceHealth(service)
          .then(isHealthy => {
            if (isHealthy) {
              resolve();
            } else {
              reject(new Error('Service started but health check failed'));
            }
          })
          .catch(() => {
            resolve(); // Resolve anyway, assuming service is starting up
          });
      } else {
        // For services without health checks, we just assume they're running
        resolve();
      }
    }, 2000);
    
    // We consider the service started when we see output
    let outputSeen = false;
    proc.stdout.on('data', (data) => {
      if (!outputSeen) {
        outputSeen = true;
        clearTimeout(timeout);
        resolve();
      }
    });
    
    proc.stderr.on('data', (data) => {
      const errorMsg = data.toString().trim();
      if (errorMsg.toLowerCase().includes('error')) {
        reject(new Error(errorMsg));
      } else if (!outputSeen) {
        // Some processes output to stderr even when starting correctly
        outputSeen = true;
        clearTimeout(timeout);
        resolve();
      }
    });
    
    // Unref the process so it continues running after the CLI exits
    proc.unref();
  });
}

/**
 * Check if a service is healthy via HTTP
 * @param {Object} service Service configuration
 * @returns {Promise<boolean>} Whether the service is healthy
 */
function checkServiceHealth(service) {
  if (!service.healthCheck) {
    return Promise.resolve(true);
  }
  
  return new Promise((resolve) => {
    http.get(service.healthCheck, (res) => {
      resolve(res.statusCode >= 200 && res.statusCode < 400);
    }).on('error', () => {
      resolve(false);
    });
  });
}

/**
 * Check if a port is in use
 * @param {number} port Port to check
 * @returns {Promise<boolean>} Whether the port is in use
 */
function isPortInUse(port) {
  return new Promise((resolve) => {
    const testServer = http.createServer();
    
    testServer.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(true);
      } else {
        resolve(false);
      }
    });
    
    testServer.once('listening', () => {
      testServer.close();
      resolve(false);
    });
    
    testServer.listen(port);
  });
}

/**
 * Check if a process is running
 * @param {string} pattern Process name pattern to match
 * @returns {Promise<boolean>} Whether a matching process is running
 */
function isProcessRunning(pattern) {
  return new Promise((resolve) => {
    let cmd;
    
    if (process.platform === 'win32') {
      cmd = `tasklist /FI "WINDOWTITLE eq *${pattern}*" /NH`;
    } else {
      cmd = `pgrep -f "${pattern}" || echo ""`;
    }
    
    exec(cmd, (error, stdout) => {
      if (error) {
        resolve(false);
        return;
      }
      
      const output = stdout.trim();
      if (process.platform === 'win32') {
        resolve(output.includes('.exe'));
      } else {
        resolve(!!output);
      }
    });
  });
}

module.exports = {
  startServices,
  stopServices,
  getServiceStatus
};

