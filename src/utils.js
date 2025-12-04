/**
 * Utility and Validation Functions
 * @module utils
 */

const { execSync } = require('child_process');
const crypto = require('crypto');
const chalk = require('chalk');
const { RESERVED_NAMES } = require('./constants');

/**
 * Validates the application name against npm naming conventions
 * @param {string} name - The app name to validate
 * @throws {Error} If validation fails
 */
function validateAppName(name) {
  if (!/^[a-z0-9-_@/]+$/i.test(name)) {
    console.error(chalk.red('❌ App name must contain only letters, numbers, hyphens, underscores, @ and /'));
    console.error(chalk.yellow('   Valid examples: my-app, @myorg/app, my_app_123'));
    process.exit(1);
  }
  
  if (name.length > 214) {
    console.error(chalk.red('❌ App name must be less than 214 characters (npm restriction)'));
    process.exit(1);
  }

  if (RESERVED_NAMES.includes(name.toLowerCase())) {
    console.error(chalk.red(`❌ "${name}" is a reserved name and cannot be used`));
    process.exit(1);
  }
}

/**
 * Checks if the Node.js version meets minimum requirements
 * @throws {Error} If Node.js version is below 20.x
 */
function checkNodeVersion() {
  const currentVersion = process.version;
  const major = parseInt(currentVersion.split('.')[0].slice(1));
  
  if (major < 20) {
    console.error(chalk.red(`❌ Node.js ${currentVersion} is not supported`));
    console.error(chalk.yellow('   This template requires Node.js >= 20.x'));
    console.error(chalk.cyan('   Please upgrade: https://nodejs.org/'));
    process.exit(1);
  }
}

/**
 * Detects the available package manager in order of preference
 * @returns {string} The detected package manager (bun, pnpm, yarn, or npm)
 */
function detectPackageManager() {
  const managers = [
    { name: 'bun', cmd: 'bun --version' },
    { name: 'pnpm', cmd: 'pnpm --version' },
    { name: 'yarn', cmd: 'yarn --version' },
  ];

  for (const { name, cmd } of managers) {
    try {
      execSync(cmd, { stdio: 'ignore' });
      return name;
    } catch {
      // Continue to next package manager
    }
  }

  return 'npm';
}

/**
 * Returns the install command for the given package manager
 * @param {string} packageManager - The package manager name
 * @returns {string} The install command
 */
function getInstallCommand(packageManager) {
  const commands = {
    npm: 'npm install',
    yarn: 'yarn install',
    pnpm: 'pnpm install',
    bun: 'bun install',
  };
  return commands[packageManager] || 'npm install';
}

/**
 * Generates a cryptographically secure JWT secret
 * @returns {string} A base64-encoded random string
 */
function generateJWTSecret() {
  return crypto.randomBytes(32).toString('base64');
}

/**
 * Returns the command prefix for running scripts
 * @param {string} packageManager - The package manager name
 * @returns {string} The command prefix (e.g., 'npm run' or 'pnpm')
 */
function getRunPrefix(packageManager) {
  return packageManager === 'npm' ? 'npm run' : packageManager;
}

module.exports = {
  validateAppName,
  checkNodeVersion,
  detectPackageManager,
  getInstallCommand,
  generateJWTSecret,
  getRunPrefix,
};
