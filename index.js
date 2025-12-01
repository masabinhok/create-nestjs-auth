#!/usr/bin/env node
const { program } = require('commander');
const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');
const chalk = require('chalk');
const inquirer = require('inquirer');

// ==================== CONFIGURATION ====================

const ORM_OPTIONS = {
  prisma: {
    name: 'Prisma',
    description: 'Next-generation ORM with type safety',
    databases: ['postgres', 'mysql', 'sqlite', 'mongodb'],
  },
  typeorm: {
    name: 'TypeORM',
    description: 'Traditional ORM with decorators',
    databases: ['postgres', 'mysql', 'sqlite'],
  },
  // Future ORMs can be added here:
  // mongoose: {
  //   name: 'Mongoose',
  //   description: 'MongoDB ODM',
  //   databases: ['mongodb'],
  // },
  // drizzle: {
  //   name: 'Drizzle',
  //   description: 'Lightweight TypeScript ORM',
  //   databases: ['postgres', 'mysql', 'sqlite'],
  // },
};

const DATABASE_OPTIONS = {
  postgres: {
    name: 'PostgreSQL',
    urlTemplate: 'postgresql://user:password@localhost:5432/database_name',
    urlPrefix: ['postgresql://', 'postgres://'],
  },
  mysql: {
    name: 'MySQL',
    urlTemplate: 'mysql://user:password@localhost:3306/database_name',
    urlPrefix: ['mysql://'],
  },
  sqlite: {
    name: 'SQLite',
    urlTemplate: 'file:./dev.db',
    urlPrefix: ['file:'],
    devOnly: true,
  },
  mongodb: {
    name: 'MongoDB',
    urlTemplate: 'mongodb://user:password@localhost:27017/database_name',
    urlPrefix: ['mongodb://', 'mongodb+srv://'],
  },
};

// ==================== VALIDATION HELPERS ====================

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

  const reservedNames = ['node_modules', 'favicon.ico'];
  if (reservedNames.includes(name.toLowerCase())) {
    console.error(chalk.red(`❌ "${name}" is a reserved name and cannot be used`));
    process.exit(1);
  }
}

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

function detectPackageManager() {
  try {
    execSync('bun --version', { stdio: 'ignore' });
    return 'bun';
  } catch {
    try {
      execSync('pnpm --version', { stdio: 'ignore' });
      return 'pnpm';
    } catch {
      try {
        execSync('yarn --version', { stdio: 'ignore' });
        return 'yarn';
      } catch {
        return 'npm';
      }
    }
  }
}

function getInstallCommand(packageManager) {
  switch (packageManager) {
    case 'npm':
      return 'npm install';
    case 'yarn':
      return 'yarn install';
    case 'pnpm':
      return 'pnpm install';
    case 'bun':
      return 'bun install';
    default:
      return 'npm install';
  }
}

function generateJWTSecret() {
  const crypto = require('crypto');
  return crypto.randomBytes(32).toString('base64');
}

// ==================== PROMPTS ====================

async function promptForProjectDetails(providedAppName, options) {
  const questions = [];

  // Ask for app name if not provided
  if (!providedAppName) {
    questions.push({
      type: 'input',
      name: 'appName',
      message: 'What is your project name?',
      default: 'my-nestjs-app',
      validate: (input) => {
        if (!input || input.trim() === '') {
          return 'Project name is required';
        }
        if (!/^[a-z0-9-_@/]+$/i.test(input)) {
          return 'Project name must contain only letters, numbers, hyphens, underscores, @ and /';
        }
        if (input.length > 214) {
          return 'Project name must be less than 214 characters';
        }
        const reservedNames = ['node_modules', 'favicon.ico'];
        if (reservedNames.includes(input.toLowerCase())) {
          return `"${input}" is a reserved name and cannot be used`;
        }
        return true;
      }
    });
  }

  // Ask for ORM if not in yes mode
  if (!options.yes) {
    const availableOrms = Object.entries(ORM_OPTIONS);
    questions.push({
      type: 'list',
      name: 'orm',
      message: 'Which ORM would you like to use?',
      choices: availableOrms.map(([key, value]) => ({
        name: `${value.name} - ${value.description}`,
        value: key,
      })),
      default: 'prisma',
    });
  }

  // Ask for database if not in yes mode
  if (!options.yes) {
    questions.push({
      type: 'list',
      name: 'database',
      message: 'Which database would you like to use?',
      choices: (answers) => {
        const selectedOrm = answers.orm || 'prisma';
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
      },
      default: 'postgres',
    });
  }

  // Ask for package manager if not specified
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
        { name: `bun${detected === 'bun' ? ' (detected)' : ''}`, value: 'bun' }
      ],
      default: detected
    });
  }

  // Ask about dependency installation if not specified
  if (!options.skipInstall && !options.yes) {
    questions.push({
      type: 'confirm',
      name: 'installDependencies',
      message: 'Install dependencies?',
      default: true
    });
  }

  // Ask about git initialization if not specified
  if (!options.skipGit && !options.yes) {
    questions.push({
      type: 'confirm',
      name: 'initializeGit',
      message: 'Initialize git repository?',
      default: true
    });
  }

  const answers = await inquirer.prompt(questions);

  return {
    appName: providedAppName || answers.appName,
    orm: options.orm || answers.orm || 'prisma',
    database: options.database || answers.database || 'postgres',
    packageManager: options.packageManager || answers.packageManager || detectPackageManager(),
    installDependencies: options.skipInstall ? false : (answers.installDependencies !== false),
    initializeGit: options.skipGit ? false : (answers.initializeGit !== false)
  };
}

// ==================== PROJECT GENERATION ====================

async function generateProject(targetDir, options) {
  const { orm, database } = options;
  const templatesDir = path.join(__dirname, 'templates');
  
  // Check if new template structure exists, fall back to old structure
  const baseDir = path.join(templatesDir, 'base');
  const ormDir = path.join(templatesDir, 'orm', orm);
  const dbDir = path.join(templatesDir, 'database', database);
  
  const useNewStructure = await fs.pathExists(baseDir);
  
  if (useNewStructure) {
    console.log(chalk.gray('   Using modular template structure...'));
    
    // Step 1: Copy base template (shared code)
    console.log(chalk.gray('   Copying base template...'));
    await fs.copy(baseDir, targetDir, {
      filter: (src) => !src.includes('node_modules') && !src.includes('.git'),
    });

    // Step 2: Copy ORM-specific files (overwrites base where needed)
    if (await fs.pathExists(ormDir)) {
      console.log(chalk.gray(`   Applying ${ORM_OPTIONS[orm]?.name || orm} adapter...`));
      await fs.copy(ormDir, targetDir, {
        overwrite: true,
        filter: (src) => !src.includes('node_modules'),
      });
    }

    // Step 3: Copy database-specific files
    if (await fs.pathExists(dbDir)) {
      console.log(chalk.gray(`   Configuring for ${DATABASE_OPTIONS[database]?.name || database}...`));
      await fs.copy(dbDir, targetDir, {
        overwrite: true,
        filter: (src) => !src.includes('node_modules'),
      });
    }
  } else {
    // Fall back to old single template structure
    console.log(chalk.gray('   Using legacy template structure...'));
    const templateDir = path.join(__dirname, 'template');
    
    if (!(await fs.pathExists(templateDir))) {
      console.error(chalk.red('❌ Template directory not found'));
      console.error(chalk.yellow('   Please reinstall create-nestjs-auth: npm install -g create-nestjs-auth'));
      process.exit(1);
    }

    await fs.copy(templateDir, targetDir, {
      filter: (src) => {
        const relativePath = path.relative(templateDir, src);
        const basename = path.basename(src);
        if (basename === '.gitignore') return true;
        return !relativePath.startsWith('.git' + path.sep) && 
               relativePath !== '.git' &&
               !relativePath.includes('node_modules') &&
               !relativePath.includes('dist');
      }
    });
  }
}

// ==================== POST SETUP ====================

async function handlePostSetup(targetDir, appName, options) {
  const { packageManager, orm, database } = options;
  const isYesMode = options.yes;
  const skipInstall = options.skipInstall;

  // Skip if user used --yes flag or if dependencies weren't installed
  if (isYesMode || skipInstall) {
    return false;
  }

  console.log(chalk.green('\n✅ Success! Created ' + chalk.bold(appName)));
  console.log(chalk.gray(`   ORM: ${ORM_OPTIONS[orm]?.name || orm}`));
  console.log(chalk.gray(`   Database: ${DATABASE_OPTIONS[database]?.name || database}`));
  console.log(chalk.white('\n🎉 Your project is ready!\n'));

  // Ask if user wants to continue with interactive setup
  const { continueSetup } = await inquirer.prompt([{
    type: 'confirm',
    name: 'continueSetup',
    message: 'Would you like to complete the setup now? (JWT secrets, database, etc.)',
    default: true
  }]);

  if (!continueSetup) {
    return false;
  }

  // Generate JWT secrets
  console.log(chalk.yellow('\n🔑 Generating JWT secrets...\n'));
  const accessSecret = generateJWTSecret();
  const refreshSecret = generateJWTSecret();
  
  console.log(chalk.gray('   Generated JWT_ACCESS_SECRET'));
  console.log(chalk.gray('   Generated JWT_REFRESH_SECRET\n'));

  // Ask for database URL
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
      const validPrefix = dbInfo.urlPrefix.some(prefix => input.startsWith(prefix));
      if (!validPrefix) {
        return `Database URL must start with ${dbInfo.urlPrefix.join(' or ')}`;
      }
      return true;
    }
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
  } catch (error) {
    console.error(chalk.red('   ✗ Failed to update .env file'));
    return false;
  }

  // Ask if user wants to setup database (ORM-specific)
  if (orm === 'prisma') {
    const { setupDatabase } = await inquirer.prompt([{
      type: 'confirm',
      name: 'setupDatabase',
      message: 'Set up the database now? (generate Prisma client, run migrations, seed)',
      default: true
    }]);

    if (setupDatabase) {
      console.log(chalk.yellow('\n📦 Setting up database...\n'));
      
      const pmPrefix = packageManager === 'npm' ? 'npm run' : packageManager;
      
      try {
        console.log(chalk.gray('   Generating Prisma client...'));
        execSync(`${pmPrefix} prisma:generate`, { cwd: targetDir, stdio: 'inherit' });
        
        console.log(chalk.gray('\n   Running database migrations...'));
        execSync(`${pmPrefix} prisma:migrate`, { cwd: targetDir, stdio: 'inherit' });
        
        console.log(chalk.gray('\n   Seeding database with default admin user...'));
        execSync(`${pmPrefix} prisma:seed`, { cwd: targetDir, stdio: 'inherit' });
        
        console.log(chalk.green('\n   ✓ Database setup complete!\n'));
        
        console.log(chalk.cyan('   📝 Default admin credentials:'));
        console.log(chalk.white('      Email:    admin@example.com'));
        console.log(chalk.white('      Password: Admin@123\n'));
      } catch (error) {
        console.error(chalk.red('\n   ✗ Database setup failed'));
        console.error(chalk.yellow('   You can run these commands manually:'));
        console.error(chalk.gray(`     ${pmPrefix} prisma:generate`));
        console.error(chalk.gray(`     ${pmPrefix} prisma:migrate`));
        console.error(chalk.gray(`     ${pmPrefix} prisma:seed\n`));
        return false;
      }
    }
  } else if (orm === 'typeorm') {
    const { setupDatabase } = await inquirer.prompt([{
      type: 'confirm',
      name: 'setupDatabase',
      message: 'Set up the database now? (run migrations, seed)',
      default: true
    }]);

    if (setupDatabase) {
      console.log(chalk.yellow('\n📦 Setting up database...\n'));
      
      const pmPrefix = packageManager === 'npm' ? 'npm run' : packageManager;
      
      try {
        console.log(chalk.gray('   Running TypeORM migrations...'));
        execSync(`${pmPrefix} typeorm:run`, { cwd: targetDir, stdio: 'inherit' });
        
        console.log(chalk.gray('\n   Seeding database with default admin user...'));
        execSync(`${pmPrefix} db:seed`, { cwd: targetDir, stdio: 'inherit' });
        
        console.log(chalk.green('\n   ✓ Database setup complete!\n'));
        
        console.log(chalk.cyan('   📝 Default admin credentials:'));
        console.log(chalk.white('      Email:    admin@example.com'));
        console.log(chalk.white('      Password: Admin@123\n'));
      } catch (error) {
        console.error(chalk.red('\n   ✗ Database setup failed'));
        console.error(chalk.yellow('   You can run these commands manually:'));
        console.error(chalk.gray(`     ${pmPrefix} typeorm:run`));
        console.error(chalk.gray(`     ${pmPrefix} db:seed\n`));
        return false;
      }
    }
  }

  // Ask if user wants to start dev server
  const { startServer } = await inquirer.prompt([{
    type: 'confirm',
    name: 'startServer',
    message: 'Start the development server now?',
    default: false
  }]);

  if (startServer) {
    console.log(chalk.yellow('\n🚀 Starting development server...\n'));
    console.log(chalk.gray(`   Your API will be available at: ${chalk.cyan('http://localhost:8080/api/v1')}`));
    console.log(chalk.gray(`   Press ${chalk.bold('Ctrl+C')} to stop the server\n`));
    
    const pmPrefix = packageManager === 'npm' ? 'npm run' : packageManager;
    
    try {
      execSync(`${pmPrefix} start:dev`, { cwd: targetDir, stdio: 'inherit' });
    } catch (error) {
      console.log(chalk.yellow('\n   Server stopped.'));
    }
  }

  return true;
}

// ==================== MAIN CLI ====================

program
  .name('create-nestjs-auth')
  .version('2.0.0')
  .description('Create a production-ready NestJS authentication system with your choice of ORM and database')
  .argument('[app-name]', 'Name of your application (optional - will prompt if not provided)')
  .option('--skip-install', 'Skip automatic dependency installation')
  .option('--package-manager <pm>', 'Package manager to use (npm|pnpm|yarn|bun)')
  .option('--skip-git', 'Skip git repository initialization')
  .option('--orm <orm>', 'ORM to use (prisma|typeorm)')
  .option('--database <db>', 'Database to use (postgres|mysql|sqlite|mongodb)')
  .option('--yes', 'Skip all prompts and use defaults')
  .action(async (appName, options) => {
    try {
      console.log(chalk.cyan('\n⚡️ create-nestjs-auth v2.0\n'));
      console.log(chalk.gray('Production-ready NestJS authentication - Now with ORM & Database choices!\n'));

      // Check Node.js version
      checkNodeVersion();

      // Interactive mode - prompt for missing information
      const projectOptions = await promptForProjectDetails(appName, options);
      appName = projectOptions.appName;

      // Validate app name
      validateAppName(appName);

      const targetDir = path.join(process.cwd(), appName);
      
      // Check if directory exists
      if (await fs.pathExists(targetDir)) {
        console.error(chalk.red(`❌ Directory "${appName}" already exists`));
        console.error(chalk.yellow('   Please choose a different name or remove the existing directory'));
        process.exit(1);
      }

      console.log(chalk.blue(`\n🚀 Creating ${chalk.bold(appName)}...`));
      console.log(chalk.gray(`   ORM: ${ORM_OPTIONS[projectOptions.orm]?.name || projectOptions.orm}`));
      console.log(chalk.gray(`   Database: ${DATABASE_OPTIONS[projectOptions.database]?.name || projectOptions.database}\n`));

      // Generate the project
      await generateProject(targetDir, projectOptions);

      // Update package.json
      console.log(chalk.gray('   Updating package.json...'));
      const packageJsonPath = path.join(targetDir, 'package.json');
      
      if (await fs.pathExists(packageJsonPath)) {
        const packageJson = await fs.readJSON(packageJsonPath);
        packageJson.name = appName;
        packageJson.version = '0.0.1';
        delete packageJson.private;
        await fs.writeJSON(packageJsonPath, packageJson, { spaces: 2 });
      }

      // Create .env from .env.example
      console.log(chalk.gray('   Setting up environment variables...'));
      const envExamplePath = path.join(targetDir, '.env.example');
      const envPath = path.join(targetDir, '.env');
      
      if (await fs.pathExists(envExamplePath)) {
        const envExample = await fs.readFile(envExamplePath, 'utf8');
        await fs.writeFile(envPath, envExample);
      }

      // Install dependencies
      if (projectOptions.installDependencies) {
        const pm = projectOptions.packageManager;
        const installCmd = getInstallCommand(pm);
        
        console.log(chalk.yellow(`\n📦 Installing dependencies with ${chalk.bold(pm)}...`));
        console.log(chalk.gray(`   Running: ${installCmd}\n`));
        
        try {
          execSync(installCmd, { 
            cwd: targetDir, 
            stdio: 'inherit',
            timeout: 300000
          });
        } catch (error) {
          console.error(chalk.red('\n❌ Dependency installation failed'));
          console.error(chalk.yellow('   You can try installing manually:'));
          console.error(chalk.cyan(`     cd ${appName}`));
          console.error(chalk.cyan(`     ${installCmd}`));
          process.exit(1);
        }
      } else {
        console.log(chalk.gray('\n   Skipping dependency installation (--skip-install)'));
      }

      // Initialize git repository
      if (projectOptions.initializeGit) {
        console.log(chalk.yellow('\n🔧 Initializing git repository...'));
        try {
          execSync('git init', { cwd: targetDir, stdio: 'ignore' });
          execSync('git add -A', { cwd: targetDir, stdio: 'ignore' });
          execSync('git commit -m "Initial commit from create-nestjs-auth"', { 
            cwd: targetDir, 
            stdio: 'ignore' 
          });
          console.log(chalk.gray('   Git repository initialized with initial commit'));
        } catch (error) {
          console.warn(chalk.yellow('   ⚠️  Git initialization failed (git may not be installed)'));
        }
      } else {
        console.log(chalk.gray('\n   Skipping git initialization (--skip-git)'));
      }

      // Post-setup interactive prompts
      const completedInteractiveSetup = await handlePostSetup(
        targetDir, 
        appName, 
        {
          ...projectOptions,
          skipInstall: !projectOptions.installDependencies,
          yes: options.yes,
        }
      );

      // Show manual instructions if interactive setup was skipped
      if (!completedInteractiveSetup) {
        console.log(chalk.green('\n✅ Success! Created ' + chalk.bold(appName)));
        console.log(chalk.gray(`   ORM: ${ORM_OPTIONS[projectOptions.orm]?.name || projectOptions.orm}`));
        console.log(chalk.gray(`   Database: ${DATABASE_OPTIONS[projectOptions.database]?.name || projectOptions.database}`));
        console.log(chalk.white('\n📚 Next steps:\n'));
        console.log(chalk.cyan(`   cd ${appName}`));
        
        if (!projectOptions.installDependencies) {
          const pm = projectOptions.packageManager;
          console.log(chalk.cyan(`   ${getInstallCommand(pm)}`));
        }
        
        console.log(chalk.cyan('   \n   # Generate secure JWT secrets (save these!):'));
        console.log(chalk.gray('   openssl rand -base64 32  # For JWT_ACCESS_SECRET'));
        console.log(chalk.gray('   openssl rand -base64 32  # For JWT_REFRESH_SECRET'));
        
        console.log(chalk.cyan('\n   # Edit .env with your database URL and JWT secrets'));
        
        if (projectOptions.orm === 'prisma') {
          console.log(chalk.cyan('   # Then setup the database:'));
          console.log(chalk.gray('   npm run prisma:generate'));
          console.log(chalk.gray('   npm run prisma:migrate'));
          console.log(chalk.gray('   npm run prisma:seed'));
        } else if (projectOptions.orm === 'typeorm') {
          console.log(chalk.cyan('   # Then setup the database:'));
          console.log(chalk.gray('   npm run typeorm:run'));
          console.log(chalk.gray('   npm run db:seed'));
        }
        
        console.log(chalk.cyan('\n   # Start development server:'));
        console.log(chalk.gray('   npm run start:dev'));
        
        console.log(chalk.white('\n📖 Documentation: https://github.com/masabinhok/create-nestjs-auth'));
        console.log(chalk.white('🐛 Issues: https://github.com/masabinhok/create-nestjs-auth/issues\n'));
        
        console.log(chalk.magenta('Happy coding! 🎉\n'));
      } else {
        console.log(chalk.white('\n📖 Documentation: https://github.com/masabinhok/create-nestjs-auth'));
        console.log(chalk.white('🐛 Issues: https://github.com/masabinhok/create-nestjs-auth/issues\n'));
        console.log(chalk.magenta('Happy coding! 🎉\n'));
      }

    } catch (error) {
      console.error(chalk.red('\n❌ An unexpected error occurred:'));
      console.error(chalk.red(`   ${error.message}`));
      
      if (error.stack) {
        console.error(chalk.gray('\n   Stack trace:'));
        console.error(chalk.gray(error.stack));
      }
      
      console.error(chalk.yellow('\n   If this persists, please report it:'));
      console.error(chalk.cyan('   https://github.com/masabinhok/create-nestjs-auth/issues\n'));
      process.exit(1);
    }
  });

program.parse();
