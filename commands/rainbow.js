const axios = require('axios');
const chalk = require('chalk');
const ora = require('ora');
const { config } = require('./config');

async function lookup(hash, options) {
  const apiKey = config.get('api_key');
  if (!apiKey) {
    console.log(chalk.red('✗ No API key configured. Run: proost config set api_key YOUR_KEY'));
    process.exit(1);
  }

  const spinner = ora('Looking up hash...').start();

  try {
    const response = await axios.post(
      `${config.get('base_url')}/v1/rainbow/lookup`,
      { hash, algorithm: options.algorithm },
      { headers: { 'X-API-Key': apiKey } }
    );

    spinner.stop();

    const result = response.data;

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (result.found) {
      console.log(chalk.green(`\n✓ Hash cracked!`));
      console.log(chalk.yellow(`   Plaintext: ${result.plaintext}`));
      console.log(chalk.dim(`   Algorithm: ${result.algorithm}`));
    } else {
      console.log(chalk.yellow('\n⚠️  Hash not found in rainbow tables'));
    }
  } catch (error) {
    spinner.stop();
    console.log(chalk.red(`\n✗ Error: ${error.response?.data?.message || error.message}`));
    process.exit(1);
  }
}

async function check(password, options) {
  const apiKey = config.get('api_key');
  if (!apiKey) {
    console.log(chalk.red('✗ No API key configured.'));
    process.exit(1);
  }

  const spinner = ora('Checking rainbow tables...').start();

  try {
    const response = await axios.post(
      `${config.get('base_url')}/v1/rainbow/check-password`,
      { password },
      { headers: { 'X-API-Key': apiKey } }
    );

    spinner.stop();

    const result = response.data;

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (result.found) {
      console.log(chalk.red(`\n⚠️  Password found in rainbow tables!`));
      console.log(chalk.yellow(`   This password is easily crackable`));
    } else {
      console.log(chalk.green('\n✓ Password not found in rainbow tables'));
    }
  } catch (error) {
    spinner.stop();
    console.log(chalk.red(`\n✗ Error: ${error.response?.data?.message || error.message}`));
    process.exit(1);
  }
}

async function algorithms() {
  const apiKey = config.get('api_key');
  if (!apiKey) {
    console.log(chalk.red('✗ No API key configured.'));
    process.exit(1);
  }

  try {
    const response = await axios.get(
      `${config.get('base_url')}/v1/rainbow/algorithms`,
      { headers: { 'X-API-Key': apiKey } }
    );

    console.log(chalk.blue('\nSupported algorithms:'));
    response.data.algorithms.forEach(algo => {
      console.log(`  ${chalk.green('✓')} ${algo}`);
    });
  } catch (error) {
    console.log(chalk.red(`✗ Error: ${error.response?.data?.message || error.message}`));
    process.exit(1);
  }
}

module.exports = { lookup, check, algorithms };
