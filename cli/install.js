#!/usr/bin/env node

/**
 * Installation script for the Voice Agent Assistant CLI
 * This script installs the CLI tool globally
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

// Banner
console.log(`
${colors.blue}╔════════════════════════════════════════════════════════════╗
║               Voice Agent Assistant CLI Installer              ║
╚════════════════════════════════════════════════════════════╝${colors.reset}
`);

// Main installation function
async function install() {
  try {
    // Verify bin/voice-agent.js exists
    const cliPath = path.join(__dirname, 'bin', 'voice-agent.js');
    if (!fs.existsSync(cliPath)) {
      console.error(`${colors.red}Error: CLI entry point not found at ${cliPath}${colors.reset}`);
      process.exit(1);
    }

    // Make the script executable
    try {
      fs.chmodSync(cliPath, '755');
      console.log(`${colors.green}✓ Made CLI executable${colors.reset}`);
    } catch (err) {
      console.log(`${colors.yellow}⚠ Could not make CLI executable: ${err.message}${colors.reset}`);
    }

    // Install globally
    console.log(`${colors.cyan}Installing Voice Agent CLI globally...${colors.reset}`);
    console.log(`This will make the 'voice-agent' command available system-wide.\n`);
    
    try {
      execSync('npm install -g .', { 
        cwd: __dirname,
        stdio: 'inherit'
      });
      
      console.log(`\n${colors.green}✓ Installation complete!${colors.reset}`);
      console.log(`\nYou can now use the CLI with the ${colors.cyan}voice-agent${colors.reset} command.`);
      console.log(`\nExample commands:`);
      console.log(`  ${colors.yellow}voice-agent start${colors.reset} - Start all services`);
      console.log(`  ${colors.yellow}voice-agent stop${colors.reset} - Stop all services`);
      console.log(`  ${colors.yellow}voice-agent status${colors.reset} - Check service status`);
      console.log(`  ${colors.yellow}voice-agent adb --list-devices${colors.reset} - List connected Android devices`);
      console.log(`  ${colors.yellow}voice-agent help${colors.reset} - Show all available commands\n`);
    } catch (err) {
      console.error(`\n${colors.red}Error during installation: ${err.message}${colors.reset}`);
      
      // Provide fallback instructions
      console.log(`\n${colors.yellow}If you encounter permission issues, try:${colors.reset}`);
      console.log(`  ${colors.cyan}sudo npm install -g .${colors.reset} (on macOS/Linux)`);
      console.log(`  or run Command Prompt as Administrator (on Windows) and try again.\n`);
      
      process.exit(1);
    }
    
  } catch (error) {
    console.error(`${colors.red}Installation failed: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

// Run the installation
install().catch(err => {
  console.error(`${colors.red}Unexpected error: ${err.message}${colors.reset}`);
  process.exit(1);
});

