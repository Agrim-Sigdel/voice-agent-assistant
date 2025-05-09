const chalk = require('chalk');
const { exec } = require('child_process');
const ora = require('ora');
const path = require('path');
const fs = require('fs');

// Get the adb controller path
const adbControllerPath = path.resolve(__dirname, '..', '..', 'adb-controller');

/**
 * Check if ADB is available and accessible
 * @returns {Promise<boolean>} Whether ADB is available
 */
async function checkAdbAvailability() {
  return new Promise((resolve) => {
    exec('adb version', (error) => {
      if (error) {
        console.error(chalk.red('ADB not found or not in PATH. Please ensure Android SDK is installed.'));
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
}

/**
 * Execute an ADB command
 * @param {string} command The ADB command to execute
 */
async function executeAdbCommand(command) {
  const spinner = ora(`Executing ADB command: ${command}`).start();
  
  if (!await checkAdbAvailability()) {
    spinner.fail('ADB not available');
    return;
  }
  
  // Check if we have a custom script to use or direct ADB
  const scriptPath = path.join(adbControllerPath, 'sendCommand.sh');
  const useScript = fs.existsSync(scriptPath) && fs.statSync(scriptPath).isFile();
  
  const cmdToRun = useScript 
    ? `${scriptPath} "${command}"`
    : `adb ${command}`;
  
  exec(cmdToRun, (error, stdout, stderr) => {
    if (error) {
      spinner.fail(`ADB command failed: ${error.message}`);
      console.error(chalk.red(stderr || 'Unknown error'));
      return;
    }
    
    spinner.succeed('ADB command executed successfully');
    if (stdout.trim()) {
      console.log(chalk.green('Output:'));
      console.log(stdout.trim());
    } else {
      console.log(chalk.yellow('No output returned'));
    }
  });
}

/**
 * List connected Android devices
 */
async function listDevices() {
  const spinner = ora('Listing connected devices...').start();
  
  if (!await checkAdbAvailability()) {
    spinner.fail('ADB not available');
    return;
  }
  
  exec('adb devices -l', (error, stdout, stderr) => {
    if (error) {
      spinner.fail(`Failed to list devices: ${error.message}`);
      console.error(chalk.red(stderr || 'Unknown error'));
      return;
    }
    
    const lines = stdout.split('\n').filter(line => line.trim().length > 0);
    
    if (lines.length <= 1) {
      spinner.info('No devices connected');
    } else {
      spinner.succeed(`Found ${lines.length - 1} device(s)`);
      
      // Skip header line
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line) {
          const parts = line.split(/\s+/);
          const deviceId = parts[0];
          const status = parts[1];
          const model = parts.find(p => p.startsWith('model:'));
          
          let displayName = deviceId;
          if (model) {
            displayName += ` (${model.split(':')[1]})`;
          }
          
          const statusColor = status === 'device' ? chalk.green : chalk.yellow;
          console.log(`  ${displayName} - ${statusColor(status)}`);
        }
      }
      
      if (lines.some(line => line.includes('unauthorized'))) {
        console.log(chalk.yellow('\nTip: For unauthorized devices, check the device screen for an authorization prompt.'));
      }
    }
  });
}

/**
 * Install an app on a connected device
 * @param {string} appPath Path to the APK file
 */
async function installApp(appPath) {
  const spinner = ora(`Installing app: ${appPath}`).start();
  
  if (!await checkAdbAvailability()) {
    spinner.fail('ADB not available');
    return;
  }
  
  if (!fs.existsSync(appPath)) {
    spinner.fail(`APK file not found: ${appPath}`);
    return;
  }
  
  exec(`adb install -r "${appPath}"`, (error, stdout, stderr) => {
    if (error) {
      spinner.fail(`Failed to install app: ${error.message}`);
      console.error(chalk.red(stderr || 'Unknown error'));
      return;
    }
    
    if (stdout.includes('Success')) {
      spinner.succeed('App installed successfully');
    } else {
      spinner.warn(`Installation completed with warning: ${stdout}`);
    }
    
    console.log(stdout.trim());
  });
}

/**
 * Capture a screenshot from a connected device
 * @param {string} filename Name of the output file
 */
async function captureScreenshot(filename) {
  const spinner = ora('Capturing screenshot...').start();
  
  if (!await checkAdbAvailability()) {
    spinner.fail('ADB not available');
    return;
  }
  
  // Ensure the filename has a .png extension
  const outputFile = filename.endsWith('.png') ? filename : `${filename}.png`;
  
  exec(`adb shell screencap -p /sdcard/screenshot.png && adb pull /sdcard/screenshot.png "${outputFile}" && adb shell rm /sdcard/screenshot.png`, (error, stdout, stderr) => {
    if (error) {
      spinner.fail(`Failed to capture screenshot: ${error.message}`);
      console.error(chalk.red(stderr || 'Unknown error'));
      return;
    }
    
    spinner.succeed(`Screenshot saved to ${outputFile}`);
    
    // Attempt to show file size
    try {
      const stats = fs.statSync(outputFile);
      const fileSize = (stats.size / 1024).toFixed(2);
      console.log(chalk.green(`File size: ${fileSize} KB`));
    } catch (err) {
      // Ignore file stat errors
    }
  });
}

/**
 * Get device information
 * @returns {Promise<Object>} Device information
 */
async function getDeviceInfo() {
  if (!await checkAdbAvailability()) {
    return { connected: false, error: 'ADB not available' };
  }
  
  return new Promise((resolve) => {
    exec('adb devices -l', (error, stdout) => {
      if (error) {
        resolve({ connected: false, error: error.message });
        return;
      }
      
      const deviceLines = stdout.split('\n').filter(line => line && !line.startsWith('List'));
      
      if (deviceLines.length === 0) {
        resolve({ connected: false });
        return;
      }
      
      const deviceInfo = deviceLines[0].trim().split(/\s+/);
      const info = {
        connected: true,
        id: deviceInfo[0],
        status: deviceInfo[1],
        model: deviceInfo.find(item => item.startsWith('model:'))?.split(':')[1] || 'Unknown'
      };
      
      // Get battery level
      exec('adb shell dumpsys battery | grep level', (error, stdout) => {
        if (!error && stdout) {
          const match = stdout.match(/level:\s*(\d+)/);
          if (match && match[1]) {
            info.battery = `${match[1]}%`;
          }
        }
        
        resolve(info);
      });
    });
  });
}

module.exports = {
  executeAdbCommand,
  listDevices,
  installApp,
  captureScreenshot,
  getDeviceInfo
};

