/**
 * Interactive Prompt Handlers
 * @module prompts
 */

const inquirer = require('inquirer');
const { ORM_OPTIONS, DATABASE_OPTIONS, RESERVED_NAMES } = require('./constants');
const { detectPackageManager } = require('./utils');

/**
 * Prompts for project configuration interactively
 * @param {string|undefined} providedAppName - App name from CLI args
 * @param {object} options - CLI options
 * @returns {Promise<object>} Project configuration
 */
async function promptForProjectDetails(providedAppName, options) {
  const questions = [];

  // App name prompt
  if (!providedAppName) {
    questions.push({
      type: 'input',
      name: 'appName',
      message: 'What is your project name?',
      default: 'my-nestjs-app',
      validate: validateAppNameInput,
    });
  }

  // ORM selection
  if (!options.yes) {
    questions.push({
      type: 'list',
      name: 'orm',
      message: 'Which ORM would you like to use?',
      choices: Object.entries(ORM_OPTIONS).map(([key, value]) => ({
        name: `${value.name} - ${value.description}`,
        value: key,
      })),
      default: 'prisma',
    });
  }

  // Database selection
  if (!options.yes) {
    questions.push({
      type: 'list',
      name: 'database',
      message: 'Which database would you like to use?',
      choices: (answers) => getDatabaseChoices(answers, options),
      default: 'postgres',
      when: (answers) => shouldShowDatabasePrompt(answers, options),
    });
  }

  // Package manager selection
  if (!options.packageManager && !options.yes) {
    const detected = detectPackageManager();
    questions.push({
      type: 'list',
      name: 'packageManager',
      message: 'Which package manager would you like to use?',
      choices: [
        { name: `npm${detected === 'npm' ? ' (detected)' : ''}`, value: 'npm' },
        { name: `pnpm${detected === 'pnpm' ? ' (detected)' : ''}`, value: 'pnpm' },
        { name: `yarn${detected === 'yarn' ? ' (detected)' : ''}`, value: 'yarn' },
        { name: `bun${detected === 'bun' ? ' (detected)' : ''}`, value: 'bun' },
      ],
      default: detected,
    });
  }

  // Install dependencies prompt
  if (!options.skipInstall && !options.yes) {
    questions.push({
      type: 'confirm',
      name: 'installDependencies',
      message: 'Install dependencies?',
      default: true,
    });
  }

  // Git initialization prompt
  if (!options.skipGit && !options.yes) {
    questions.push({
      type: 'confirm',
      name: 'initializeGit',
      message: 'Initialize git repository?',
      default: true,
    });
  }

  const answers = await inquirer.prompt(questions);

  // Determine ORM and database
  const selectedOrm = options.orm || answers.orm || 'prisma';
  const selectedDatabase = ORM_OPTIONS[selectedOrm]?.fixedDatabase
    ? ORM_OPTIONS[selectedOrm].databases[0]
    : options.database || answers.database || 'postgres';

  return {
    appName: providedAppName || answers.appName,
    orm: selectedOrm,
    database: selectedDatabase,
    packageManager: options.packageManager || answers.packageManager || detectPackageManager(),
    installDependencies: options.skipInstall ? false : answers.installDependencies !== false,
    initializeGit: options.skipGit ? false : answers.initializeGit !== false,
  };
}

/**
 * Validates app name input from inquirer
 * @param {string} input - User input
 * @returns {boolean|string} True if valid, error message if invalid
 */
function validateAppNameInput(input) {
  if (!input || input.trim() === '') {
    return 'Project name is required';
  }
  if (!/^[a-z0-9-_@/]+$/i.test(input)) {
    return 'Project name must contain only letters, numbers, hyphens, underscores, @ and /';
  }
  if (input.length > 214) {
    return 'Project name must be less than 214 characters';
  }
  if (RESERVED_NAMES.includes(input.toLowerCase())) {
    return `"${input}" is a reserved name and cannot be used`;
  }
  return true;
}

/**
 * Gets database choices based on selected ORM
 * @param {object} answers - Previous answers
 * @param {object} options - CLI options
 * @returns {Array} Database choices for inquirer
 */
function getDatabaseChoices(answers, options) {
  const selectedOrm = answers.orm || options.orm || 'prisma';
  const supportedDatabases = ORM_OPTIONS[selectedOrm]?.databases || ['postgres'];

  return supportedDatabases.map((db) => {
    const dbInfo = DATABASE_OPTIONS[db];
    const suffix = dbInfo.devOnly ? ' (Development only)' : '';
    const recommended = db === 'postgres' ? ' (Recommended)' : '';
    return {
      name: `${dbInfo.name}${recommended}${suffix}`,
      value: db,
    };
  });
}

/**
 * Determines if database prompt should be shown
 * @param {object} answers - Previous answers
 * @param {object} options - CLI options
 * @returns {boolean} Whether to show database prompt
 */
function shouldShowDatabasePrompt(answers, options) {
  const selectedOrm = answers.orm || options.orm || 'prisma';
  return !ORM_OPTIONS[selectedOrm]?.fixedDatabase;
}

module.exports = {
  promptForProjectDetails,
};
