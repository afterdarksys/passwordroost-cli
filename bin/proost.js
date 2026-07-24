#!/usr/bin/env node

/**
 * proost - PasswordRoost CLI
 * Command-line interface for PasswordRoost API
 */

const { Command } = require('commander');
const chalk = require('chalk');
const pkg = require('../package.json');
const commands = require('../commands');

const program = new Command();

program
  .name('proost')
  .description('PasswordRoost CLI - Password breach detection and security tools')
  .version(pkg.version);

// Config commands
const configCmd = program
  .command('config')
  .description('Manage configuration');

configCmd
  .command('set <key> <value>')
  .description('Set a configuration value')
  .action(commands.config.set);

configCmd
  .command('get [key]')
  .description('Get configuration value(s)')
  .action(commands.config.get);

configCmd
  .command('list')
  .description('List all configuration')
  .action(commands.config.list);

// Breach commands
const breachCmd = program
  .command('breach')
  .description('Check passwords for breaches');

breachCmd
  .command('check <password>')
  .description('Check if a password has been breached')
  .option('-j, --json', 'Output as JSON')
  .action(commands.breach.check);

breachCmd
  .command('email <email>')
  .description('Check whether an email address appears in known breaches')
  .option('-j, --json', 'Output as JSON')
  .action(commands.breach.checkEmail);

// Rainbow table commands
const rainbowCmd = program
  .command('rainbow')
  .description('Rainbow table lookups');

rainbowCmd
  .command('lookup <hash>')
  .description('Look up a hash in rainbow tables')
  .option('-a, --algorithm <algo>', 'Hash algorithm (md5, sha1, etc.)', 'md5')
  .option('-j, --json', 'Output as JSON')
  .action(commands.rainbow.lookup);

rainbowCmd
  .command('check <password>')
  .description('Check if a password is in rainbow tables')
  .option('-j, --json', 'Output as JSON')
  .action(commands.rainbow.check);

rainbowCmd
  .command('algorithms')
  .description('List supported hash algorithms')
  .action(commands.rainbow.algorithms);

// Crack commands
const crackCmd = program
  .command('crack')
  .description('GPU-powered password cracking');

crackCmd
  .command('create')
  .description('Create a new cracking job')
  .requiredOption('-t, --type <type>', 'Hash type (wpa2, md5, sha1, etc.)')
  .requiredOption('-f, --file <file>', 'Hash or PCAP file')
  .option('-g, --gpu <type>', 'GPU type', 'RTX4090')
  .option('-h, --hours <hours>', 'Rental hours', '4')
  .option('-w, --wordlist <wordlist>', 'Wordlist to use', 'rockyou')
  .action(commands.crack.create);

crackCmd
  .command('status <jobId>')
  .description('Get cracking job status')
  .option('-j, --json', 'Output as JSON')
  .action(commands.crack.status);

crackCmd
  .command('cancel <jobId>')
  .description('Cancel a cracking job')
  .action(commands.crack.cancel);

crackCmd
  .command('list')
  .description('List your cracking jobs')
  .option('--email <email>', 'Filter by email')
  .action(commands.crack.list);

// Monitor commands
const monitorCmd = program
  .command('monitor')
  .description('Breach monitoring jobs');

monitorCmd
  .command('create <password>')
  .description('Create a breach monitoring job')
  .option('-e, --email <email>', 'Email for alerts')
  .action(commands.monitor.create);

monitorCmd
  .command('status <jobId>')
  .description('Get monitoring job status')
  .action(commands.monitor.status);

monitorCmd
  .command('list <email>')
  .description('List monitoring jobs for an email')
  .action(commands.monitor.list);

// Keys commands
const keysCmd = program
  .command('keys')
  .description('Manage API keys');

keysCmd
  .command('list')
  .description('List your API keys')
  .action(commands.keys.list);

keysCmd
  .command('create')
  .description('Create a new API key')
  .option('-n, --name <name>', 'Key name')
  .option('-t, --tier <tier>', 'Tier (free, developer, professional)', 'free')
  .action(commands.keys.create);

keysCmd
  .command('revoke <keyId>')
  .description('Revoke an API key')
  .action(commands.keys.revoke);

keysCmd
  .command('usage <keyId>')
  .description('View API key usage statistics')
  .action(commands.keys.usage);

// Usage command
program
  .command('usage')
  .description('View your API usage statistics')
  .option('-k, --key-id <keyId>', 'Specific API key')
  .action(commands.usage);

// Auth command
program
  .command('login')
  .description('Authenticate with PasswordRoost')
  .action(commands.auth.login);

program
  .command('logout')
  .description('Logout from PasswordRoost')
  .action(commands.auth.logout);

// Parse arguments
program.parse(process.argv);

// Show help if no command specified
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
