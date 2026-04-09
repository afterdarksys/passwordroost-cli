const chalk = require('chalk');
const ora = require('ora');
const Table = require('cli-table3');

async function list() {
  console.log(chalk.yellow('\nAPI key management via CLI requires authentication.'));
  console.log(chalk.dim('Please visit: https://developer.passwordroost.com'));
}

async function create(options) {
  console.log(chalk.yellow('\nAPI key creation via CLI requires authentication.'));
  console.log(chalk.dim('Please visit: https://developer.passwordroost.com'));
}

async function revoke(keyId) {
  console.log(chalk.yellow('\nAPI key revocation via CLI requires authentication.'));
  console.log(chalk.dim('Please visit: https://developer.passwordroost.com'));
}

async function usage(keyId) {
  console.log(chalk.yellow('\nUsage statistics available at:'));
  console.log(chalk.dim('https://developer.passwordroost.com'));
}

module.exports = { list, create, revoke, usage };
