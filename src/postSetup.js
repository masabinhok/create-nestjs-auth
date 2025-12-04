/**
 * Post-Setup Interactive Handlers
 * @module postSetup
 */

const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');
const chalk = require('chalk');
const inquirer = require('inquirer');
const { ORM_OPTIONS, DATABASE_OPTIONS } = require('./constants');
const { generateJWTSecret, getRunPrefix } = require('./utils');

/**
 * Handles interactive post-setup configuration
 * @param {string} targetDir - Project directory
 * @param {string} appName - Application name
 * @param {object} options - Configuration options
 * @returns {Promise<boolean>} Whether interactive setup completed
 */
async function handlePostSetup(targetDir, appName, options) {
  const { packageManager, orm, database, yes: isYesMode, skipInstall } = options;

  if (isYesMode || skipInstall) {
    return false;
  }

  printSuccessHeader(appName, orm, database);

  const { continueSetup } = await inquirer.prompt([{
    type: 'confirm',
    name: 'continueSetup',
    message: 'Would you like to complete the setup now? (JWT secrets, database, etc.)',
    default: true,
  }]);

  if (!continueSetup) {
    return false;
  }

  // Configure JWT secrets and database URL
  await configureEnvironment(targetDir, database);

  // ORM-specific database setup
  await setupDatabase(targetDir, orm, packageManager);

  // Optionally start dev server
  await promptDevServer(targetDir, packageManager);

  return true;
}

/**
 * Prints the success header
 */
function printSuccessHeader(appName, orm, database) {
  console.log(chalk.green('\n✅ Success! Created ' + chalk.bold(appName)));
  console.log(chalk.gray(`   ORM: ${ORM_OPTIONS[orm]?.name || orm}`));
  console.log(chalk.gray(`   Database: ${DATABASE_OPTIONS[database]?.name || database}`));
  console.log(chalk.white('\n🎉 Your project is ready!\n'));
}

/**
 * Configures environment variables
 */
async function configureEnvironment(targetDir, database) {
  console.log(chalk.yellow('\n🔑 Generating JWT secrets...\n'));
  const accessSecret = generateJWTSecret();
  const refreshSecret = generateJWTSecret();
  
  console.log(chalk.gray('   Generated JWT_ACCESS_SECRET'));
  console.log(chalk.gray('   Generated JWT_REFRESH_SECRET\n'));

  const dbInfo = DATABASE_OPTIONS[database];
  const { databaseUrl } = await inquirer.prompt([{
    type: 'input',
    name: 'databaseUrl',
    message: `Enter your ${dbInfo.name} database URL:`,
    default: dbInfo.urlTemplate,
    validate: (input) => {
      if (!input || input.trim() === '') {
        return 'Database URL is required';
      }
      const validPrefix = dbInfo.urlPrefix.some((prefix) => input.startsWith(prefix));
      if (!validPrefix) {
        return `Database URL must start with ${dbInfo.urlPrefix.join(' or ')}`;
      }
      return true;
    },
  }]);

  // Update .env file
  console.log(chalk.gray('\n   Updating .env file...'));
  const envPath = path.join(targetDir, '.env');
  
  try {
    let envContent = await fs.readFile(envPath, 'utf8');
    envContent = envContent.replace(/DATABASE_URL=.*/, `DATABASE_URL="${databaseUrl}"`);
    envContent = envContent.replace(/JWT_ACCESS_SECRET=.*/, `JWT_ACCESS_SECRET="${accessSecret}"`);
    envContent = envContent.replace(/JWT_REFRESH_SECRET=.*/, `JWT_REFRESH_SECRET="${refreshSecret}"`);
    await fs.writeFile(envPath, envContent);
    console.log(chalk.green('   ✓ Environment variables configured\n'));
  } catch {
    console.error(chalk.red('   ✗ Failed to update .env file'));
  }
}

/**
 * Sets up the database based on selected ORM
 */
async function setupDatabase(targetDir, orm, packageManager) {
  const setupHandlers = {
    prisma: setupPrisma,
    typeorm: setupTypeOrm,
    mongoose: setupMongoose,
    drizzle: setupDrizzle,
  };

  const handler = setupHandlers[orm];
  if (handler) {
    await handler(targetDir, packageManager);
  }
}

async function setupPrisma(targetDir, packageManager) {
  const { setupDatabase } = await inquirer.prompt([{
    type: 'confirm',
    name: 'setupDatabase',
    message: 'Set up the database now? (generate Prisma client, run migrations, seed)',
    default: true,
  }]);

  if (!setupDatabase) return;

  console.log(chalk.yellow('\n📦 Setting up database...\n'));
  const pmPrefix = getRunPrefix(packageManager);

  try {
    console.log(chalk.gray('   Generating Prisma client...'));
    execSync(`${pmPrefix} prisma:generate`, { cwd: targetDir, stdio: 'inherit' });
    
    console.log(chalk.gray('\n   Running database migrations...'));
    execSync(`${pmPrefix} prisma:migrate`, { cwd: targetDir, stdio: 'inherit' });
    
    console.log(chalk.gray('\n   Seeding database...'));
    execSync(`${pmPrefix} prisma:seed`, { cwd: targetDir, stdio: 'inherit' });
    
    printCredentials();
  } catch {
    console.error(chalk.red('\n   ✗ Database setup failed'));
    console.error(chalk.yellow('   Run these commands manually:'));
    console.error(chalk.gray(`     ${pmPrefix} prisma:generate`));
    console.error(chalk.gray(`     ${pmPrefix} prisma:migrate`));
    console.error(chalk.gray(`     ${pmPrefix} prisma:seed\n`));
  }
}

async function setupTypeOrm(targetDir, packageManager) {
  const { setupDatabase } = await inquirer.prompt([{
    type: 'confirm',
    name: 'setupDatabase',
    message: 'Set up the database now? (sync schema, seed)',
    default: true,
  }]);

  if (!setupDatabase) return;

  console.log(chalk.yellow('\n📦 Setting up database...\n'));
  const pmPrefix = getRunPrefix(packageManager);

  try {
    console.log(chalk.gray('   Synchronizing database schema...'));
    execSync(`${pmPrefix} schema:sync`, { cwd: targetDir, stdio: 'inherit' });
    
    console.log(chalk.gray('\n   Seeding database...'));
    execSync(`${pmPrefix} seed`, { cwd: targetDir, stdio: 'inherit' });
    
    printCredentials();
  } catch {
    console.error(chalk.red('\n   ✗ Database setup failed'));
    console.error(chalk.yellow('   Run these commands manually:'));
    console.error(chalk.gray(`     ${pmPrefix} schema:sync`));
    console.error(chalk.gray(`     ${pmPrefix} seed\n`));
  }
}

async function setupMongoose(targetDir, packageManager) {
  const { setupDatabase } = await inquirer.prompt([{
    type: 'confirm',
    name: 'setupDatabase',
    message: 'Seed the database now? (create default admin user)',
    default: true,
  }]);

  if (!setupDatabase) return;

  console.log(chalk.yellow('\n📦 Setting up database...\n'));
  const pmPrefix = getRunPrefix(packageManager);

  try {
    console.log(chalk.gray('   Seeding database...'));
    execSync(`${pmPrefix} db:seed`, { cwd: targetDir, stdio: 'inherit' });
    
    printCredentials();
  } catch {
    console.error(chalk.red('\n   ✗ Database setup failed'));
    console.error(chalk.yellow('   Run this command manually:'));
    console.error(chalk.gray(`     ${pmPrefix} db:seed\n`));
  }
}

async function setupDrizzle(targetDir, packageManager) {
  const { setupDatabase } = await inquirer.prompt([{
    type: 'confirm',
    name: 'setupDatabase',
    message: 'Set up the database now? (push schema, seed)',
    default: true,
  }]);

  if (!setupDatabase) return;

  console.log(chalk.yellow('\n📦 Setting up database...\n'));
  const pmPrefix = getRunPrefix(packageManager);

  try {
    console.log(chalk.gray('   Pushing schema to database...'));
    execSync(`${pmPrefix} db:push`, { cwd: targetDir, stdio: 'inherit' });
    
    console.log(chalk.gray('\n   Seeding database...'));
    execSync(`${pmPrefix} db:seed`, { cwd: targetDir, stdio: 'inherit' });
    
    printCredentials();
  } catch {
    console.error(chalk.red('\n   ✗ Database setup failed'));
    console.error(chalk.yellow('   Run these commands manually:'));
    console.error(chalk.gray(`     ${pmPrefix} db:push`));
    console.error(chalk.gray(`     ${pmPrefix} db:seed\n`));
  }
}

/**
 * Prints default admin credentials
 */
function printCredentials() {
  console.log(chalk.green('\n   ✓ Database setup complete!\n'));
  console.log(chalk.cyan('   📝 Default admin credentials:'));
  console.log(chalk.white('      Email:    admin@example.com'));
  console.log(chalk.white('      Password: Admin@123\n'));
}

/**
 * Prompts user to start dev server
 */
async function promptDevServer(targetDir, packageManager) {
  const { startServer } = await inquirer.prompt([{
    type: 'confirm',
    name: 'startServer',
    message: 'Start the development server now?',
    default: false,
  }]);

  if (!startServer) return;

  console.log(chalk.yellow('\n🚀 Starting development server...\n'));
  console.log(chalk.gray(`   Your API will be available at: ${chalk.cyan('http://localhost:8080/api/v1')}`));
  console.log(chalk.gray(`   Press ${chalk.bold('Ctrl+C')} to stop the server\n`));

  const pmPrefix = getRunPrefix(packageManager);
  
  try {
    execSync(`${pmPrefix} start:dev`, { cwd: targetDir, stdio: 'inherit' });
  } catch {
    console.log(chalk.yellow('\n   Server stopped.'));
  }
}

/**
 * Prints manual setup instructions when interactive setup is skipped
 */
function printManualInstructions(appName, options) {
  const { orm, database, packageManager, installDependencies } = options;
  
  console.log(chalk.green('\n✅ Success! Created ' + chalk.bold(appName)));
  console.log(chalk.gray(`   ORM: ${ORM_OPTIONS[orm]?.name || orm}`));
  console.log(chalk.gray(`   Database: ${DATABASE_OPTIONS[database]?.name || database}`));
  console.log(chalk.white('\n📚 Next steps:\n'));
  console.log(chalk.cyan(`   cd ${appName}`));
  
  if (!installDependencies) {
    const installCmd = require('./utils').getInstallCommand(packageManager);
    console.log(chalk.cyan(`   ${installCmd}`));
  }
  
  console.log(chalk.cyan('\n   # Generate secure JWT secrets (save these!):'));
  console.log(chalk.gray('   openssl rand -base64 32  # For JWT_ACCESS_SECRET'));
  console.log(chalk.gray('   openssl rand -base64 32  # For JWT_REFRESH_SECRET'));
  console.log(chalk.cyan('\n   # Edit .env with your database URL and JWT secrets'));
  
  const ormCommands = {
    prisma: ['prisma:generate', 'prisma:migrate', 'prisma:seed'],
    typeorm: ['schema:sync', 'seed'],
    mongoose: ['db:seed'],
    drizzle: ['db:push', 'db:seed'],
  };
  
  const commands = ormCommands[orm];
  if (commands) {
    console.log(chalk.cyan('\n   # Then setup the database:'));
    commands.forEach((cmd) => console.log(chalk.gray(`   npm run ${cmd}`)));
  }
  
  console.log(chalk.cyan('\n   # Start development server:'));
  console.log(chalk.gray('   npm run start:dev'));
  
  console.log(chalk.white('\n📖 Documentation: https://github.com/masabinhok/create-nestjs-auth'));
  console.log(chalk.white('🐛 Issues: https://github.com/masabinhok/create-nestjs-auth/issues\n'));
  console.log(chalk.magenta('Happy coding! 🎉\n'));
}

module.exports = {
  handlePostSetup,
  printManualInstructions,
};
