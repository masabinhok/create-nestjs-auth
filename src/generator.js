/**
 * Project Generation Logic
 * @module generator
 */

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const { ORM_OPTIONS } = require('./constants');

/**
 * Generates the project by merging base, ORM, and database templates
 * @param {string} targetDir - Target directory for the project
 * @param {object} options - Generation options
 */
async function generateProject(targetDir, options) {
  const { orm, database } = options;
  const templatesDir = path.join(__dirname, '..', 'templates');
  
  const baseDir = path.join(templatesDir, 'base');
  const ormDir = path.join(templatesDir, 'orm', orm);
  const dbDir = path.join(templatesDir, 'database', database);
  
  const useNewStructure = await fs.pathExists(baseDir);
  
  if (useNewStructure) {
    await generateFromModularTemplates(targetDir, { baseDir, ormDir, dbDir, orm });
  } else {
    await generateFromLegacyTemplate(targetDir);
  }
}

/**
 * Generates project from modular template structure
 * @param {string} targetDir - Target directory
 * @param {object} dirs - Directory paths
 */
async function generateFromModularTemplates(targetDir, { baseDir, ormDir, dbDir, orm }) {
  console.log(chalk.gray('   Using modular template structure...'));
  
  // Ensure target directory exists
  await fs.ensureDir(targetDir);
  
  // Step 1: Copy base template
  console.log(chalk.gray('   Copying base template...'));
  await fs.copy(baseDir, targetDir, {
    filter: createCopyFilter(baseDir),
  });

  // Step 2: Apply ORM adapter
  if (await fs.pathExists(ormDir)) {
    console.log(chalk.gray(`   Applying ${ORM_OPTIONS[orm]?.name || orm} adapter...`));
    await fs.copy(ormDir, targetDir, {
      overwrite: true,
      filter: createCopyFilter(ormDir, ['package.json']),
    });
    
    await mergePackageJson(ormDir, targetDir);
  }

  // Step 3: Apply database configuration
  if (await fs.pathExists(dbDir)) {
    console.log(chalk.gray(`   Configuring database...`));
    await fs.copy(dbDir, targetDir, {
      overwrite: true,
      filter: createOrmSpecificFilter(orm, dbDir),
    });
    
    await mergePackageJson(dbDir, targetDir, true);
  }
}

/**
 * Generates project from legacy single-template structure
 * @param {string} targetDir - Target directory
 */
async function generateFromLegacyTemplate(targetDir) {
  console.log(chalk.gray('   Using legacy template structure...'));
  const templateDir = path.join(__dirname, '..', 'template');
  
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
    },
  });
}

/**
 * Creates a copy filter function
 * @param {string} baseDir - The base directory being copied from
 * @param {Array<string>} excludeFiles - Additional files to exclude
 * @returns {function} Filter function
 */
function createCopyFilter(baseDir, excludeFiles = []) {
  return (src) => {
    const basename = path.basename(src);
    const relativePath = path.relative(baseDir, src);
    
    if (basename === '.gitignore') return true;
    if (excludeFiles.includes(basename)) return false;
    
    // Check for node_modules and .git only within the template directory
    return !relativePath.includes('node_modules') && 
           !relativePath.includes(path.sep + '.git') &&
           basename !== '.git';
  };
}

/**
 * Creates ORM-specific filter for database templates
 * @param {string} orm - Selected ORM
 * @param {string} dbDir - Database directory path
 * @returns {function} Filter function
 */
function createOrmSpecificFilter(orm, dbDir) {
  const drizzleFiles = ['drizzle.config.ts', 'drizzle'];
  const prismaFiles = ['prisma'];

  return (src) => {
    const basename = path.basename(src);
    const relativePath = path.relative(dbDir, src);

    if (basename === '.gitignore') return true;
    // Check for node_modules only within the template directory (not in the CLI install path)
    if (relativePath.includes('node_modules') || basename === 'package.json') return false;

    // Filter based on ORM
    if (orm === 'prisma') {
      if (drizzleFiles.some((f) => relativePath.startsWith(f) || basename === f)) return false;
      if (relativePath.includes('src' + path.sep + 'database')) return false;
    } else if (orm === 'drizzle') {
      if (prismaFiles.some((f) => relativePath.startsWith(f) || basename === f)) return false;
    } else if (orm === 'typeorm' || orm === 'mongoose') {
      if (drizzleFiles.some((f) => relativePath.startsWith(f) || basename === f)) return false;
      if (prismaFiles.some((f) => relativePath.startsWith(f) || basename === f)) return false;
      if (relativePath.includes('src' + path.sep + 'database')) return false;
    }

    return true;
  };
}

/**
 * Merges package.json files
 * @param {string} sourceDir - Source directory
 * @param {string} targetDir - Target directory
 * @param {boolean} dependenciesOnly - Only merge dependencies
 */
async function mergePackageJson(sourceDir, targetDir, dependenciesOnly = false) {
  const sourcePackageJsonPath = path.join(sourceDir, 'package.json');
  const targetPackageJsonPath = path.join(targetDir, 'package.json');

  if (!(await fs.pathExists(sourcePackageJsonPath))) return;

  const sourcePackageJson = await fs.readJSON(sourcePackageJsonPath);
  let targetPackageJson = {};

  // Ensure target directory exists before writing
  await fs.ensureDir(targetDir);

  if (await fs.pathExists(targetPackageJsonPath)) {
    targetPackageJson = await fs.readJSON(targetPackageJsonPath);
  }

  if (dependenciesOnly) {
    targetPackageJson = {
      ...targetPackageJson,
      dependencies: { ...targetPackageJson.dependencies, ...sourcePackageJson.dependencies },
      devDependencies: { ...targetPackageJson.devDependencies, ...sourcePackageJson.devDependencies },
    };
  } else {
    targetPackageJson = {
      ...targetPackageJson,
      ...sourcePackageJson,
      dependencies: { ...targetPackageJson.dependencies, ...sourcePackageJson.dependencies },
      devDependencies: { ...targetPackageJson.devDependencies, ...sourcePackageJson.devDependencies },
      scripts: { ...targetPackageJson.scripts, ...sourcePackageJson.scripts },
    };
  }

  await fs.writeJSON(targetPackageJsonPath, targetPackageJson, { spaces: 2 });
}

module.exports = {
  generateProject,
};
