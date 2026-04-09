const axios = require('axios');
const chalk = require('chalk');
const ora = require('ora');
const fs = require('fs');
const { config } = require('./config');
const Table = require('cli-table3');

async function create(options) {
  const apiKey = config.get('api_key');
  if (!apiKey) {
    console.log(chalk.red('✗ No API key configured.'));
    process.exit(1);
  }

  // Read file
  if (!fs.existsSync(options.file)) {
    console.log(chalk.red(`✗ File not found: ${options.file}`));
    process.exit(1);
  }

  const hashData = fs.readFileSync(options.file, 'base64');

  const spinner = ora('Creating cracking job...').start();

  try {
    const response = await axios.post(
      `${config.get('base_url')}/api/gpu/crack-jobs`,
      {
        jobType: options.type,
        hashData,
        gpuType: options.gpu,
        rentalHours: parseInt(options.hours),
        wordlist: options.wordlist
      },
      { headers: { 'X-API-Key': apiKey } }
    );

    spinner.stop();

    const job = response.data.job;

    console.log(chalk.green(`\n✓ Cracking job created!`));
    console.log(chalk.yellow(`   Job ID: ${job.id}`));
    console.log(chalk.yellow(`   Status: ${job.status}`));
    console.log(chalk.yellow(`   GPU: ${job.gpuType}`));
    console.log(chalk.yellow(`   Price: $${job.totalPrice}`));
    console.log(chalk.dim(`\n   Check status: proost crack status ${job.id}`));
  } catch (error) {
    spinner.stop();
    console.log(chalk.red(`✗ Error: ${error.response?.data?.message || error.message}`));
    process.exit(1);
  }
}

async function status(jobId, options) {
  const apiKey = config.get('api_key');
  if (!apiKey) {
    console.log(chalk.red('✗ No API key configured.'));
    process.exit(1);
  }

  const spinner = ora('Fetching job status...').start();

  try {
    const response = await axios.get(
      `${config.get('base_url')}/api/gpu/crack-jobs/${jobId}`,
      { headers: { 'X-API-Key': apiKey } }
    );

    spinner.stop();

    const job = response.data.job;

    if (options.json) {
      console.log(JSON.stringify(job, null, 2));
      return;
    }

    console.log(chalk.blue(`\nJob: ${job.id}`));
    console.log(`  Status: ${chalk.yellow(job.status)}`);
    console.log(`  Progress: ${chalk.green(job.progress + '%')}`);
    if (job.speed) console.log(`  Speed: ${job.speed}`);
    if (job.eta) console.log(`  ETA: ${job.eta}`);

    if (job.crackedPassword) {
      console.log(chalk.green(`\n✓ Password cracked: ${job.crackedPassword}`));
    }
  } catch (error) {
    spinner.stop();
    console.log(chalk.red(`✗ Error: ${error.response?.data?.message || error.message}`));
    process.exit(1);
  }
}

async function cancel(jobId) {
  const apiKey = config.get('api_key');
  if (!apiKey) {
    console.log(chalk.red('✗ No API key configured.'));
    process.exit(1);
  }

  const spinner = ora('Cancelling job...').start();

  try {
    await axios.post(
      `${config.get('base_url')}/api/gpu/crack-jobs/${jobId}/cancel`,
      {},
      { headers: { 'X-API-Key': apiKey } }
    );

    spinner.stop();
    console.log(chalk.green('✓ Job cancelled'));
  } catch (error) {
    spinner.stop();
    console.log(chalk.red(`✗ Error: ${error.response?.data?.message || error.message}`));
    process.exit(1);
  }
}

async function list(options) {
  const apiKey = config.get('api_key');
  if (!apiKey) {
    console.log(chalk.red('✗ No API key configured.'));
    process.exit(1);
  }

  if (!options.email) {
    console.log(chalk.red('✗ Email required. Use --email <email>'));
    process.exit(1);
  }

  const spinner = ora('Fetching jobs...').start();

  try {
    const response = await axios.get(
      `${config.get('base_url')}/api/gpu/crack-jobs/by-email/${options.email}`,
      { headers: { 'X-API-Key': apiKey } }
    );

    spinner.stop();

    const jobs = response.data.jobs;

    if (jobs.length === 0) {
      console.log(chalk.yellow('\nNo jobs found'));
      return;
    }

    const table = new Table({
      head: ['Job ID', 'Type', 'Status', 'Progress', 'Created'],
      style: { head: ['cyan'] }
    });

    jobs.forEach(job => {
      table.push([
        job.id.substring(0, 8) + '...',
        job.jobType,
        job.status,
        job.progress + '%',
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

module.exports = { create, status, cancel, list };
