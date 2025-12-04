/**
 * Module exports for CLI source files
 * @module src
 */

module.exports = {
  ...require('./constants'),
  ...require('./utils'),
  ...require('./prompts'),
  ...require('./generator'),
  ...require('./postSetup'),
};
