const chalk = require('chalk');

async function usage(options) {
  console.log(chalk.yellow('\nUsage statistics available at:'));
  console.log(chalk.dim('https://developer.passwordroost.com'));
}

module.exports = usage;
