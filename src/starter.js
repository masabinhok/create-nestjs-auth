/**
 * Starter mode (default since v3): scaffolds a project from a tagged release
 * of masabinhok/nestjs-auth-starter, the NestJS 12 starter built on the
 * official @nestjs/authentication and @nestjs/authorization packages.
 * @module starter
 */

const fs = require('fs-extra');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const chalk = require('chalk');
const inquirer = require('inquirer');

const STARTER_REPO = 'masabinhok/nestjs-auth-starter';
/** The starter release new projects are created from. Bump with each starter release. */
const STARTER_REF = 'v2.0.0';
const STARTER_MIN_NODE = [24, 9];

/** Optional features of the starter, and the .env switch for each. */
const FEATURES = {
  mfa: { name: 'Two-factor authentication (TOTP)', env: 'AUTH_MFA' },
  passkeys: { name: 'Passkeys (WebAuthn)', env: 'AUTH_PASSKEYS' },
  magicLink: { name: 'Magic links', env: 'AUTH_MAGIC_LINK' },
  apiKeys: { name: 'Personal API keys', env: 'AUTH_API_KEYS' },
};

/** Files that describe the starter project itself, not the new app. */
const STARTER_ONLY_FILES = [
  'CHANGELOG.md',
  'CODE_OF_CONDUCT.md',
  'CONTRIBUTING.md',
  'SECURITY.md',
  'banner.svg',
  'release-please-config.json',
  '.release-please-manifest.json',
  '.github/ISSUE_TEMPLATE',
  '.github/PULL_REQUEST_TEMPLATE.md',
  '.github/workflows/release.yml',
  '.github/workflows/docker-publish.yml',
  '.github/workflows/pr.yml',
  'docs/migration-v2.md',
];

const secret = () => crypto.randomBytes(32).toString('base64url');

async function promptStarterOptions(appName, options) {
  const all = Object.keys(FEATURES);
  if (options.yes) {
    return {
      appName: appName || 'my-nestjs-app',
      features: all,
      installDependencies: !options.skipInstall,
      initializeGit: !options.skipGit,
    };
  }
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'appName',
      message: 'What is your project name?',
      default: 'my-nestjs-app',
      when: !appName,
    },
    {
      type: 'checkbox',
      name: 'features',
      message: 'Which optional features do you want? (you can switch them later in .env)',
      choices: all.map((key) => ({ name: FEATURES[key].name, value: key, checked: true })),
    },
    {
      type: 'confirm',
      name: 'installDependencies',
      message: 'Install dependencies with pnpm now?',
      default: true,
      when: !options.skipInstall,
    },
    {
      type: 'confirm',
      name: 'initializeGit',
      message: 'Initialize a git repository?',
      default: true,
      when: !options.skipGit,
    },
  ]);
  return {
    appName: appName || answers.appName,
    features: answers.features,
    installDependencies: !options.skipInstall && answers.installDependencies !== false,
    initializeGit: !options.skipGit && answers.initializeGit !== false,
  };
}

/** Downloads the starter release and unpacks it into targetDir. */
async function downloadStarter(targetDir, ref) {
  const url = `https://codeload.github.com/${STARTER_REPO}/tar.gz/refs/tags/${ref}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Could not download ${STARTER_REPO}@${ref} (HTTP ${response.status})`);
  }
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'create-nestjs-auth-'));
  const archive = path.join(tmp, 'starter.tar.gz');
  try {
    await fs.writeFile(archive, Buffer.from(await response.arrayBuffer()));
    await fs.ensureDir(targetDir);
    // tar ships with Linux, macOS and Windows 10+.
    execFileSync('tar', ['-xzf', archive, '-C', targetDir, '--strip-components=1'], {
      stdio: 'ignore',
    });
  } finally {
    await fs.remove(tmp);
  }
}

/** Turns the downloaded starter into the user's project. */
async function personalize(targetDir, { appName, features }, ref) {
  for (const file of STARTER_ONLY_FILES) {
    await fs.remove(path.join(targetDir, file));
  }

  const pkgPath = path.join(targetDir, 'package.json');
  const pkg = await fs.readJSON(pkgPath);
  pkg.name = appName;
  pkg.version = '0.0.1';
  pkg.private = true;
  pkg.description = '';
  delete pkg.repository;
  delete pkg.keywords;
  await fs.writeJSON(pkgPath, pkg, { spaces: 2 });

  // .env with fresh secrets and the chosen features.
  let env = await fs.readFile(path.join(targetDir, '.env.example'), 'utf8');
  env = env
    .replace(/^AUTH_JWT_SECRET=.*$/m, `AUTH_JWT_SECRET=${secret()}`)
    .replace(/^AUTH_MFA_ENCRYPTION_KEY=.*$/m, `AUTH_MFA_ENCRYPTION_KEY=${secret()}`);
  for (const [key, feature] of Object.entries(FEATURES)) {
    const on = features.includes(key);
    env = env.replace(new RegExp(`^${feature.env}=.*$`, 'm'), `${feature.env}=${on}`);
  }
  await fs.writeFile(path.join(targetDir, '.env'), env);

  const readmePath = path.join(targetDir, 'README.md');
  const readme = await fs.readFile(readmePath, 'utf8');
  await fs.writeFile(
    readmePath,
    `> Created with [create-nestjs-auth](https://github.com/masabinhok/create-nestjs-auth) from [${STARTER_REPO}@${ref}](https://github.com/${STARTER_REPO}/tree/${ref}).\n\n${readme}`,
  );
}

function warnOnOldNode() {
  const [major, minor] = process.versions.node.split('.').map(Number);
  const [needMajor, needMinor] = STARTER_MIN_NODE;
  if (major < needMajor || (major === needMajor && minor < needMinor)) {
    console.log(
      chalk.yellow(
        `   ⚠️  The project needs Node ${needMajor}.${needMinor}+ (you have ${process.versions.node}). ` +
          'Docker works without it: docker compose up.',
      ),
    );
    return false;
  }
  return true;
}

function run(cmd, args, cwd) {
  execFileSync(cmd, args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' });
}

async function createFromStarter(appName, options, { validateAppName }) {
  const ref = options.ref || STARTER_REF;
  const answers = await promptStarterOptions(appName, options);
  validateAppName(answers.appName);

  const targetDir = path.join(process.cwd(), answers.appName);
  if (await fs.pathExists(targetDir)) {
    throw new Error(`Directory "${answers.appName}" already exists`);
  }

  console.log(chalk.blue(`\n🚀 Creating ${chalk.bold(answers.appName)} from ${STARTER_REPO}@${ref}...`));
  await downloadStarter(targetDir, ref);
  await personalize(targetDir, answers, ref);
  console.log(chalk.gray('   Generated .env with fresh secrets'));
  const nodeOk = warnOnOldNode();

  if (answers.installDependencies && nodeOk) {
    console.log(chalk.yellow('\n📦 Installing dependencies (pnpm via corepack)...\n'));
    try {
      run('corepack', ['pnpm', 'install'], targetDir);
    } catch {
      console.log(chalk.yellow('   Install failed; run `corepack enable && pnpm install` yourself.'));
    }
  }

  if (answers.initializeGit) {
    try {
      execFileSync('git', ['init', '-q'], { cwd: targetDir });
      execFileSync('git', ['add', '-A'], { cwd: targetDir });
      execFileSync('git', ['commit', '-q', '-m', 'Initial commit from create-nestjs-auth'], {
        cwd: targetDir,
      });
      console.log(chalk.gray('   Initialized a git repository'));
    } catch {
      console.log(chalk.yellow('   ⚠️  Git initialization skipped (is git installed and configured?)'));
    }
  }

  console.log(chalk.green(`\n✅ Created ${answers.appName}\n`));
  console.log(chalk.white('Run everything with Docker:'));
  console.log(chalk.cyan(`  cd ${answers.appName}`));
  console.log(chalk.cyan('  docker compose up -d'));
  console.log(chalk.cyan('  docker compose run --rm seed'));
  console.log(chalk.white('\nThen open:'));
  console.log(chalk.cyan('  http://localhost:8080/docs   API reference'));
  console.log(chalk.cyan('  http://localhost:8025        emails the app sends'));
  console.log(chalk.white('\nOr develop locally (Node 24.9+): see README.md → "Run the API outside Docker".'));
  console.log(chalk.gray(`\nDocs: https://github.com/${STARTER_REPO}/tree/${ref}/docs\n`));
}

module.exports = {
  STARTER_REPO,
  STARTER_REF,
  FEATURES,
  STARTER_ONLY_FILES,
  createFromStarter,
  downloadStarter,
  personalize,
};
