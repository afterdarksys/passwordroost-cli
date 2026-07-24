const axios = require('axios');
const crypto = require('crypto');
const chalk = require('chalk');
const ora = require('ora');
const { config } = require('./config');
const Table = require('cli-table3');

function jobHeaders(apiKey, jobId) {
  const token = config.get(`job_tokens.${jobId}`);
  return {
    'X-API-Key': apiKey,
    ...(token ? { 'X-Job-Token': token } : {})
  };
}

async function create(password, options) {
  const apiKey = config.get('api_key');
  if (!apiKey) {
    console.log(chalk.red('✗ No API key configured.'));
    process.exit(1);
  }

  const hashValue = crypto.createHash('sha1').update(password).digest('hex');
  const spinner = ora('Creating monitoring job...').start();

  try {
    const response = await axios.post(
      `${config.get('base_url')}/api/jobs`,
      { hashValue, email: options.email },
      { headers: { 'X-API-Key': apiKey } }
    );

    spinner.stop();

    const job = response.data;
    if (job.accessToken) {
      config.set(`job_tokens.${job.jobId}`, job.accessToken);
    }
    console.log(chalk.green(`\n✓ Monitoring job created!`));
    console.log(chalk.yellow(`   Job ID: ${job.jobId}`));
    if (options.email) {
      console.log(chalk.yellow(`   Alerts: Enabled for ${options.email}`));
    }
  } catch (error) {
    spinner.stop();
    console.log(chalk.red(`✗ Error: ${error.response?.data?.message || error.message}`));
    process.exit(1);
  }
}

async function status(jobId) {
  const apiKey = config.get('api_key');
  if (!apiKey) {
    console.log(chalk.red('✗ No API key configured.'));
    process.exit(1);
  }

  const spinner = ora('Fetching job status...').start();

  try {
    const response = await axios.get(
      `${config.get('base_url')}/api/jobs/${jobId}`,
      { headers: jobHeaders(apiKey, jobId) }
    );

    spinner.stop();

    const job = response.data;

    console.log(chalk.blue(`\nJob: ${job.jobId}`));
    console.log(`  Breach count: ${chalk.yellow(job.breachCount)}`);
    console.log(`  Last checked: ${new Date(job.lastCheckedAt).toLocaleString()}`);
    console.log(`  Alerts: ${job.alertEnabled ? chalk.green('Enabled') : chalk.dim('Disabled')}`);
  } catch (error) {
    spinner.stop();
    console.log(chalk.red(`✗ Error: ${error.response?.data?.message || error.message}`));
    process.exit(1);
  }
}

async function list(email) {
  const apiKey = config.get('api_key');
  if (!apiKey) {
    console.log(chalk.red('✗ No API key configured.'));
    process.exit(1);
  }

  const spinner = ora('Fetching jobs...').start();

  try {
    const response = await axios.get(
      `${config.get('base_url')}/api/jobs/by-email/${email}`,
      { headers: { 'X-API-Key': apiKey } }
    );

    spinner.stop();

    const jobs = response.data.jobs;

    if (jobs.length === 0) {
      console.log(chalk.yellow('\nNo monitoring jobs found'));
      return;
    }

    const table = new Table({
      head: ['Job ID', 'Breaches', 'Alerts', 'Created'],
      style: { head: ['cyan'] }
    });

    jobs.forEach(job => {
      table.push([
        job.jobId.substring(0, 12) + '...',
        job.breachCount,
        job.alertEnabled ? '✓' : '✗',
        new Date(job.createdAt).toLocaleDateString()
      ]);
    });

    console.log(table.toString());
  } catch (error) {
    spinner.stop();
    console.log(chalk.red(`✗ Error: ${error.response?.data?.message || error.message}`));
    process.exit(1);
  }
}

module.exports = { create, status, list };
