const axios = require('axios');
const chalk = require('chalk');
const ora = require('ora');
const { config } = require('./config');

async function check(password, options) {
  const apiKey = config.get('api_key');
  if (!apiKey) {
    console.log(chalk.red('✗ No API key configured. Run: proost config set api_key YOUR_KEY'));
    process.exit(1);
  }

  const spinner = ora('Checking for breaches...').start();

  try {
    const response = await axios.post(
      `${config.get('base_url')}/v1/breach/check`,
      { password },
      {
        headers: { 'X-API-Key': apiKey }
      }
    );

    spinner.stop();

    const result = response.data;

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (result.found) {
      console.log(chalk.red(`\n⚠️  PASSWORD FOUND IN BREACHES`));
      console.log(chalk.yellow(`   Breach count: ${result.breachCount.toLocaleString()}`));
      console.log(chalk.yellow(`   Sources: ${result.sources.join(', ')}`));
      if (result.recommendation) {
        console.log(chalk.cyan(`\n   💡 ${result.recommendation}`));
      }
    } else {
      console.log(chalk.green('\n✓ Password not found in known breaches'));
      console.log(chalk.dim('   (But you should still use strong, unique passwords)'));
    }
  } catch (error) {
    spinner.stop();
    console.log(chalk.red(`\n✗ Error: ${error.response?.data?.message || error.message}`));
    process.exit(1);
  }
}

module.exports = { check };
