const chalk = require('chalk');

async function login() {
  console.log(chalk.blue('\nTo authenticate:'));
  console.log('1. Visit https://developer.passwordroost.com');
  console.log('2. Create an API key');
  console.log('3. Run: proost config set api_key YOUR_KEY');
}

async function logout() {
  const { config } = require('./config');
  config.delete('api_key');
  console.log(chalk.green('✓ Logged out (API key cleared)'));
}

module.exports = { login, logout };
