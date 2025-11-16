#!/usr/bin/env node
const { program } = require('commander');
const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');
const chalk = require('chalk');

program
  .name('create-nestjs-auth')
  .description('Clone the NestJS auth boilerplate')
  .argument('<app-name>', 'Name of your app')
  .action(async (appName) => {
    const targetDir = path.join(process.cwd(), appName);
    
    // Prevent overwrite
    if (fs.existsSync(targetDir)) {
      console.log(chalk.red(`❌ Directory ${appName} already exists`));
      process.exit(1);
    }

    console.log(chalk.blue(`🚀 Creating ${appName}...`));
    
    // Copy your ENTIRE existing app as template
    // (Assumes it's in a "template" folder next to index.js)
    const templateDir = path.join(__dirname, 'template');
    await fs.copy(templateDir, targetDir);

    // Replace package.json name
    const packageJsonPath = path.join(targetDir, 'package.json');
    const packageJson = await fs.readJSON(packageJsonPath);
    packageJson.name = appName;
    await fs.writeJSON(packageJsonPath, packageJson, { spaces: 2 });

    // Create fresh .env
    const envExample = await fs.readFile(path.join(targetDir, '.env.example'), 'utf8');
    await fs.writeFile(path.join(targetDir, '.env'), envExample);

    console.log(chalk.yellow('📦 Installing dependencies...'));
    execSync('npm install', { cwd: targetDir, stdio: 'inherit' });

    console.log(chalk.green('✅ Done!'));
    console.log(chalk.white(`\nNext steps:\n  cd ${appName}\n  docker-compose up -d\n  npm run start:dev`));
  });

program.parse();