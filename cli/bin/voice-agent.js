#!/usr/bin/env node

const { program } = require('commander');
const chalk = require('chalk');
const figlet = require('figlet');
const { startServices, stopServices, getServiceStatus } = require('../lib/services');
const { executeAdbCommand, listDevices, installApp, captureScreenshot } = require('../lib/adb');
const { startJadeContainer, stopJadeContainer, listAgents } = require('../lib/jade');
const { monitorSystem } = require('../lib/monitor');
const pkg = require('../package.json');

// Display banner
console.log(
  chalk.blue(
    figlet.textSync('Voice Agent CLI', { horizontalLayout: 'full' })
  )
);

program
  .version(pkg.version)
  .description('Voice Agent Assistant CLI');

// Service management commands
program
  .command('service')
  .description('Manage Voice Agent Assistant services')
  .option('-s, --start', 'Start all services')
  .option('-k, --stop', 'Stop all services')
  .option('-r, --restart', 'Restart all services')
  .option('-m, --middleware', 'Only affect middleware service')
  .option('-u, --ui', 'Only affect UI service')
  .option('-j, --jade', 'Only affect JADE platform')
  .action((options) => {
    if (options.start) {
      startServices(options);
    } else if (options.stop) {
      stopServices(options);
    } else if (options.restart) {
      stopServices(options);
      setTimeout(() => startServices(options), 1000);
    } else {
      console.log(chalk.yellow('Please specify an action (--start, --stop, or --restart)'));
    }
  });

// ADB commands
program
  .command('adb')
  .description('Control Android device via ADB')
  .option('-l, --list-devices', 'List connected devices')
  .option('-c, --command <command>', 'Execute ADB command')
  .option('-i, --install <app-path>', 'Install app on device')
  .option('-s, --screenshot <filename>', 'Capture screenshot')
  .action((options) => {
    if (options.listDevices) {
      listDevices();
    } else if (options.command) {
      executeAdbCommand(options.command);
    } else if (options.install) {
      installApp(options.install);
    } else if (options.screenshot) {
      captureScreenshot(options.screenshot);
    } else {
      console.log(chalk.yellow('Please specify an ADB action'));
    }
  });

// JADE agent management
program
  .command('jade')
  .description('Manage JADE agents')
  .option('-s, --start', 'Start JADE container')
  .option('-k, --stop', 'Stop JADE container')
  .option('-l, --list-agents', 'List running agents')
  .option('-c, --create <agent-type>', 'Create new agent (bridge, router, phone)')
  .action((options) => {
    if (options.start) {
      startJadeContainer();
    } else if (options.stop) {
      stopJadeContainer();
    } else if (options.listAgents) {
      listAgents();
    } else if (options.create) {
      console.log(chalk.yellow(`Creating ${options.create} agent - feature under development`));
    } else {
      console.log(chalk.yellow('Please specify a JADE action'));
    }
  });

// Monitor system
program
  .command('monitor')
  .description('Monitor system status')
  .option('-a, --all', 'Monitor all components')
  .option('-m, --middleware', 'Monitor middleware')
  .option('-j, --jade', 'Monitor JADE platform')
  .option('-d, --device', 'Monitor connected devices')
  .action((options) => {
    monitorSystem(options);
  });

// Quick commands
program
  .command('start')
  .description('Start all Voice Agent Assistant services')
  .action(() => {
    startServices({});
  });

program
  .command('stop')
  .description('Stop all Voice Agent Assistant services')
  .action(() => {
    stopServices({});
  });

program
  .command('devices')
  .description('List connected Android devices')
  .action(() => {
    listDevices();
  });

// Status command
program
  .command('status')
  .description('Show status of all components')
  .action(async () => {
    const spinner = require('ora')('Checking system status...').start();
    try {
      const serviceStatus = await getServiceStatus();
      spinner.succeed('System status:');
      
      console.log(`Middleware: ${serviceStatus.middleware ? chalk.green('Running') : chalk.red('Stopped')}`);
      console.log(`UI Server: ${serviceStatus.ui ? chalk.green('Running') : chalk.red('Stopped')}`);
      console.log(`JADE Platform: ${serviceStatus.jade ? chalk.green('Running') : chalk.red('Stopped')}`);
      
      // Check device status
      listDevices();
    } catch (error) {
      spinner.fail('Error checking status');
      console.error(error);
    }
  });

program.parse(process.argv);

// Display help if no arguments provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}

