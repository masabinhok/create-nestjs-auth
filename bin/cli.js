#!/usr/bin/env node
/**
 * create-nestjs-auth CLI
 * Scaffold production-ready NestJS authentication projects
 * 
 * @author Sabin Shrestha <sabin.shrestha.er@gmail.com>
 * @license MIT
 */

const { program } = require('commander');
const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');
const chalk = require('chalk');

// Resolve paths relative to the package root
const packageRoot = path.join(__dirname, '..');

const {
  CLI_VERSION,
  ORM_OPTIONS,
  DATABASE_OPTIONS,
  validateAppName,
  checkNodeVersion,
  getInstallCommand,
  promptForProjectDetails,
  generateProject,
  handlePostSetup,
  printManualInstructions,
} = require(path.join(packageRoot, 'src'));

// ==================== MAIN CLI ====================

program
  .name('create-nestjs-auth')
  .version(CLI_VERSION)
  .description('Create a production-ready NestJS authentication system with your choice of ORM and database')
  .argument('[app-name]', 'Name of your application (optional - will prompt if not provided)')
  .option('--skip-install', 'Skip automatic dependency installation')
  .option('--package-manager <pm>', 'Package manager to use (npm|pnpm|yarn|bun)')
  .option('--skip-git', 'Skip git repository initialization')
  .option('--orm <orm>', 'ORM to use (prisma|typeorm|drizzle|mongoose)')
  .option('--database <db>', 'Database to use (postgres|mysql|sqlite|mongodb)')
  .option('--yes', 'Skip all prompts and use defaults')
  .action(async (appName, options) => {
    try {
      console.log(chalk.cyan(`\n⚡️ create-nestjs-auth v${CLI_VERSION}\n`));
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
            timeout: 300000,
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
            stdio: 'ignore',
          });
          console.log(chalk.gray('   Git repository initialized with initial commit'));
        } catch {
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
        printManualInstructions(appName, projectOptions);
      } else {
        console.log(chalk.white('\n📖 Documentation: https://github.com/masabinhok/create-nestjs-auth'));
        console.log(chalk.white('🐛 Issues: https://github.com/masabinhok/create-nestjs-auth/issues\n'));
        console.log(chalk.magenta('Happy coding! 🎉\n'));
      }

    } catch (error) {
      console.error(chalk.red('\n❌ An unexpected error occurred:'));
      console.error(chalk.red(`   ${error.message}`));
      
      if (error.stack && process.env.DEBUG) {
        console.error(chalk.gray('\n   Stack trace:'));
        console.error(chalk.gray(error.stack));
      }
      
      console.error(chalk.yellow('\n   If this persists, please report it:'));
      console.error(chalk.cyan('   https://github.com/masabinhok/create-nestjs-auth/issues\n'));
      process.exit(1);
    }
  });

program.parse();
