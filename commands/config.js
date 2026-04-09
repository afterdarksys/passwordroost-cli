const Conf = require('conf');
const chalk = require('chalk');

const config = new Conf({
  projectName: 'proost',
  defaults: {
    api_key: '',
    base_url: 'https://api.passwordroost.com'
  }
});

async function set(key, value) {
  config.set(key, value);
  console.log(chalk.green(`✓ Set ${key} = ${value}`));
}

async function get(key) {
  if (key) {
    const value = config.get(key);
    if (value === undefined) {
      console.log(chalk.red(`✗ Configuration key "${key}" not found`));
      process.exit(1);
    }
    console.log(value);
  } else {
    console.log(chalk.blue('Current configuration:'));
    const all = config.store;
    Object.entries(all).forEach(([k, v]) => {
      console.log(`  ${k} = ${k.includes('key') ? '***' : v}`);
    });
  }
}

async function list() {
  const all = config.store;
  console.log(chalk.blue('Configuration:'));
  Object.entries(all).forEach(([k, v]) => {
    console.log(`  ${chalk.yellow(k)}: ${k.includes('key') ? '***' : v}`);
  });
}

module.exports = { set, get, list, config };
