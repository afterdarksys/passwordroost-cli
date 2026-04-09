#!/usr/bin/env node
/**
 * After Dark Identity CLI (adi)
 *
 * Command-line interface for managing After Dark Identity:
 * - Passkey management
 * - DID operations
 * - Credential management
 * - Recovery setup
 *
 * Usage: adi <command> [options]
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Configuration
const CONFIG_DIR = path.join(process.env.HOME || process.env.USERPROFILE, '.afterdark');
const CONFIG_FILE = path.join(CONFIG_DIR, 'identity.json');
const DEFAULT_API_URL = 'https://login.afterdarksys.com';

// ANSI colors
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

// ============================================================================
// UTILITIES
// ============================================================================

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function error(message) {
    console.error(`${colors.red}Error: ${message}${colors.reset}`);
}

function success(message) {
    console.log(`${colors.green}${message}${colors.reset}`);
}

function info(message) {
    console.log(`${colors.cyan}${message}${colors.reset}`);
}

function loadConfig() {
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
        }
    } catch (e) {
        // Ignore
    }
    return {};
}

function saveConfig(config) {
    try {
        if (!fs.existsSync(CONFIG_DIR)) {
            fs.mkdirSync(CONFIG_DIR, { recursive: true });
        }
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    } catch (e) {
        error(`Failed to save config: ${e.message}`);
    }
}

async function prompt(question) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise(resolve => {
        rl.question(question, answer => {
            rl.close();
            resolve(answer);
        });
    });
}

async function promptPassword(question) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    // Note: This doesn't hide input in all terminals
    // For production, use a library like 'read' or 'inquirer'
    return new Promise(resolve => {
        rl.question(question, answer => {
            rl.close();
            resolve(answer);
        });
    });
}

async function apiRequest(method, endpoint, data = null, token = null) {
    const config = loadConfig();
    const baseUrl = config.apiUrl || DEFAULT_API_URL;
    const authToken = token || config.token;

    const url = new URL(endpoint, baseUrl);
    const isHttps = url.protocol === 'https:';
    const httpModule = isHttps ? https : http;

    const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method: method,
        headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'AfterDarkIdentityCLI/1.0'
        }
    };

    if (authToken) {
        options.headers['Authorization'] = `Bearer ${authToken}`;
    }

    return new Promise((resolve, reject) => {
        const req = httpModule.request(options, res => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(body);
                    if (res.statusCode >= 400) {
                        reject(new Error(json.error || `HTTP ${res.statusCode}`));
                    } else {
                        resolve(json);
                    }
                } catch (e) {
                    reject(new Error(`Invalid response: ${body.substring(0, 100)}`));
                }
            });
        });

        req.on('error', reject);

        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

// ============================================================================
// COMMANDS
// ============================================================================

const commands = {
    // Login command
    async login(args) {
        const email = args[0] || await prompt('Email: ');
        const password = await promptPassword('Password: ');

        try {
            info('Authenticating...');
            const result = await apiRequest('POST', '/auth/login', { email, password });

            const config = loadConfig();
            config.token = result.token;
            config.user = result.user;
            saveConfig(config);

            success(`Logged in as ${result.user.email}`);

            if (result.did) {
                info(`DID: ${result.did}`);
            }
        } catch (e) {
            error(e.message);
        }
    },

    // Logout command
    async logout() {
        const config = loadConfig();
        delete config.token;
        delete config.user;
        saveConfig(config);
        success('Logged out');
    },

    // Whoami command
    async whoami() {
        const config = loadConfig();
        if (!config.token) {
            error('Not logged in. Run: adi login');
            return;
        }

        try {
            const result = await apiRequest('GET', '/auth/me');
            log(`${colors.bright}User:${colors.reset} ${result.user.email}`);
            log(`${colors.bright}ID:${colors.reset} ${result.user.id}`);
            log(`${colors.bright}Role:${colors.reset} ${result.user.role || 'user'}`);
        } catch (e) {
            error(e.message);
        }
    },

    // Passkey commands
    async passkeys(args) {
        const subcommand = args[0];

        switch (subcommand) {
            case 'list':
                await this.passkeysList();
                break;
            case 'check':
                await this.passkeysCheck();
                break;
            default:
                log('Passkey commands:');
                log('  adi passkeys list   - List your passkeys');
                log('  adi passkeys check  - Check if you have passkeys');
                log('');
                log('Note: Passkey registration requires a browser.');
                log('Visit https://login.afterdarksys.com/account to register passkeys.');
        }
    },

    async passkeysList() {
        const config = loadConfig();
        if (!config.token) {
            error('Not logged in. Run: adi login');
            return;
        }

        try {
            const result = await apiRequest('GET', '/auth/passkeys');

            if (result.passkeys.length === 0) {
                info('No passkeys registered.');
                info('Visit https://login.afterdarksys.com/account to register a passkey.');
                return;
            }

            log(`${colors.bright}Your Passkeys:${colors.reset}`);
            for (const pk of result.passkeys) {
                log(`  - ${pk.name}`);
                log(`    Created: ${new Date(pk.createdAt).toLocaleDateString()}`);
                if (pk.lastUsedAt) {
                    log(`    Last used: ${new Date(pk.lastUsedAt).toLocaleDateString()}`);
                }
            }
        } catch (e) {
            error(e.message);
        }
    },

    async passkeysCheck() {
        const config = loadConfig();
        if (!config.token) {
            error('Not logged in. Run: adi login');
            return;
        }

        try {
            const result = await apiRequest('GET', '/auth/passkeys/check');

            if (result.hasPasskeys) {
                success('You have passkeys configured');
            } else {
                info('No passkeys configured.');
                info('Visit https://login.afterdarksys.com/account to set up passwordless login.');
            }
        } catch (e) {
            error(e.message);
        }
    },

    // DID commands
    async did(args) {
        const subcommand = args[0];

        switch (subcommand) {
            case 'list':
                await this.didList();
                break;
            case 'resolve':
                await this.didResolve(args.slice(1));
                break;
            case 'create':
                await this.didCreate(args.slice(1));
                break;
            case 'primary':
                await this.didPrimary(args.slice(1));
                break;
            default:
                log('DID commands:');
                log('  adi did list              - List your DIDs');
                log('  adi did resolve <did>     - Resolve a DID to its document');
                log('  adi did create            - Create a new DID from your passkey');
                log('  adi did primary           - Show your primary DID');
        }
    },

    async didList() {
        const config = loadConfig();
        if (!config.token) {
            error('Not logged in. Run: adi login');
            return;
        }

        try {
            const result = await apiRequest('GET', '/auth/did');

            if (result.dids.length === 0) {
                info('No DIDs found.');
                info('Create one with: adi did create');
                return;
            }

            log(`${colors.bright}Your DIDs:${colors.reset}`);
            for (const did of result.dids) {
                const primary = did.isPrimary ? ` ${colors.green}[PRIMARY]${colors.reset}` : '';
                const deactivated = did.deactivated ? ` ${colors.red}[DEACTIVATED]${colors.reset}` : '';
                log(`  ${did.did}${primary}${deactivated}`);
            }
        } catch (e) {
            error(e.message);
        }
    },

    async didResolve(args) {
        const did = args[0];
        if (!did) {
            error('DID required. Usage: adi did resolve <did>');
            return;
        }

        try {
            const result = await apiRequest('GET', `/auth/did/${encodeURIComponent(did)}/resolve`);

            if (result.didResolutionMetadata?.error) {
                error(`Resolution failed: ${result.didResolutionMetadata.error}`);
                return;
            }

            log(`${colors.bright}DID Document:${colors.reset}`);
            console.log(JSON.stringify(result.didDocument, null, 2));

            if (result.didDocumentMetadata) {
                log(`\n${colors.bright}Metadata:${colors.reset}`);
                log(`  Created: ${result.didDocumentMetadata.created}`);
                log(`  Updated: ${result.didDocumentMetadata.updated}`);
                log(`  Deactivated: ${result.didDocumentMetadata.deactivated}`);
            }
        } catch (e) {
            error(e.message);
        }
    },

    async didCreate(args) {
        const config = loadConfig();
        if (!config.token) {
            error('Not logged in. Run: adi login');
            return;
        }

        // First check for passkeys
        try {
            const passkeys = await apiRequest('GET', '/auth/passkeys');
            if (passkeys.passkeys.length === 0) {
                error('No passkeys found. Register a passkey first.');
                info('Visit https://login.afterdarksys.com/account to register a passkey.');
                return;
            }

            // Use the first passkey
            const passkeyId = passkeys.passkeys[0].id;
            info(`Creating DID from passkey "${passkeys.passkeys[0].name}"...`);

            const result = await apiRequest('POST', '/auth/did/create', { passkeyId });

            if (result.created) {
                success(`DID created: ${result.did}`);
            } else {
                info(`DID already exists: ${result.did}`);
            }

            if (result.isPrimary) {
                info('This is your primary DID.');
            }
        } catch (e) {
            error(e.message);
        }
    },

    async didPrimary(args) {
        const config = loadConfig();
        if (!config.token) {
            error('Not logged in. Run: adi login');
            return;
        }

        // If a DID is provided, set it as primary
        if (args[0]) {
            try {
                await apiRequest('PUT', `/auth/did/${encodeURIComponent(args[0])}/primary`);
                success(`Primary DID set to: ${args[0]}`);
            } catch (e) {
                error(e.message);
            }
            return;
        }

        // Otherwise, show primary DID
        try {
            const result = await apiRequest('GET', '/auth/did/primary');
            log(`${colors.bright}Primary DID:${colors.reset} ${result.did}`);
        } catch (e) {
            if (e.message.includes('No DID found')) {
                info('No DID found. Create one with: adi did create');
            } else {
                error(e.message);
            }
        }
    },

    // Credentials commands
    async credentials(args) {
        const subcommand = args[0];

        switch (subcommand) {
            case 'list':
                await this.credentialsList();
                break;
            case 'issue':
                await this.credentialsIssue(args.slice(1));
                break;
            case 'verify':
                await this.credentialsVerify(args.slice(1));
                break;
            case 'schemas':
                await this.credentialsSchemas();
                break;
            default:
                log('Credentials commands:');
                log('  adi credentials list      - List your credentials');
                log('  adi credentials issue     - Issue standard credentials to yourself');
                log('  adi credentials verify    - Verify a credential');
                log('  adi credentials schemas   - List available credential types');
        }
    },

    async credentialsList() {
        const config = loadConfig();
        if (!config.token) {
            error('Not logged in. Run: adi login');
            return;
        }

        try {
            const result = await apiRequest('GET', '/auth/credentials');

            if (result.credentials.length === 0) {
                info('No credentials found.');
                info('Issue standard credentials with: adi credentials issue');
                return;
            }

            log(`${colors.bright}Your Credentials:${colors.reset}`);
            for (const cred of result.credentials) {
                const revoked = cred.revoked ? ` ${colors.red}[REVOKED]${colors.reset}` : '';
                const expired = cred.expiresAt && new Date(cred.expiresAt) < new Date()
                    ? ` ${colors.yellow}[EXPIRED]${colors.reset}` : '';

                log(`  ${colors.cyan}${cred.typeName}${colors.reset}${revoked}${expired}`);
                log(`    ID: ${cred.id}`);
                log(`    Issued: ${new Date(cred.issuedAt).toLocaleDateString()}`);
                if (cred.expiresAt) {
                    log(`    Expires: ${new Date(cred.expiresAt).toLocaleDateString()}`);
                }
            }
        } catch (e) {
            error(e.message);
        }
    },

    async credentialsIssue(args) {
        const config = loadConfig();
        if (!config.token) {
            error('Not logged in. Run: adi login');
            return;
        }

        try {
            info('Issuing standard credentials...');
            const result = await apiRequest('POST', '/auth/credentials/issue-standard');

            if (result.issued === 0) {
                info('No new credentials to issue.');
                info('You may already have all available credentials, or need to verify your email/phone first.');
                return;
            }

            success(`Issued ${result.issued} credential(s):`);
            for (const cred of result.credentials) {
                log(`  - ${cred.type}`);
            }
        } catch (e) {
            error(e.message);
        }
    },

    async credentialsVerify(args) {
        const credentialFile = args[0];
        if (!credentialFile) {
            error('Credential file required. Usage: adi credentials verify <file.json>');
            return;
        }

        try {
            const credentialJson = fs.readFileSync(credentialFile, 'utf8');
            const credential = JSON.parse(credentialJson);

            info('Verifying credential...');
            const result = await apiRequest('POST', '/auth/credentials/verify', { credential });

            if (result.verified) {
                success('Credential is VALID');
            } else {
                error('Credential is INVALID');
            }

            if (result.errors.length > 0) {
                log(`${colors.red}Errors:${colors.reset}`);
                for (const err of result.errors) {
                    log(`  - ${err}`);
                }
            }

            if (result.warnings.length > 0) {
                log(`${colors.yellow}Warnings:${colors.reset}`);
                for (const warn of result.warnings) {
                    log(`  - ${warn}`);
                }
            }

            log(`\n${colors.bright}Details:${colors.reset}`);
            log(`  Issuer: ${result.details.issuer}`);
            log(`  Subject: ${result.details.subject}`);
            log(`  Type: ${result.details.type?.join(', ')}`);
            log(`  Issued: ${result.details.issuanceDate}`);
            if (result.details.expirationDate) {
                log(`  Expires: ${result.details.expirationDate}`);
            }
        } catch (e) {
            if (e.code === 'ENOENT') {
                error(`File not found: ${credentialFile}`);
            } else {
                error(e.message);
            }
        }
    },

    async credentialsSchemas() {
        try {
            const result = await apiRequest('GET', '/auth/credentials/schemas');

            log(`${colors.bright}Available Credential Types:${colors.reset}`);
            for (const schema of result.schemas) {
                log(`\n  ${colors.cyan}${schema.name}${colors.reset} (${schema.id})`);
                log(`    ${schema.description}`);
                if (schema.default_validity_days) {
                    log(`    Validity: ${schema.default_validity_days} days`);
                }
            }
        } catch (e) {
            error(e.message);
        }
    },

    // Config command
    async config(args) {
        const subcommand = args[0];

        switch (subcommand) {
            case 'set':
                await this.configSet(args.slice(1));
                break;
            case 'get':
                await this.configGet(args.slice(1));
                break;
            case 'show':
                await this.configShow();
                break;
            default:
                log('Config commands:');
                log('  adi config show           - Show current configuration');
                log('  adi config set <key> <value>  - Set a configuration value');
                log('  adi config get <key>      - Get a configuration value');
                log('');
                log('Available keys:');
                log('  apiUrl    - API base URL (default: https://login.afterdarksys.com)');
        }
    },

    async configSet(args) {
        const [key, value] = args;
        if (!key || !value) {
            error('Usage: adi config set <key> <value>');
            return;
        }

        const config = loadConfig();
        config[key] = value;
        saveConfig(config);
        success(`Set ${key} = ${value}`);
    },

    async configGet(args) {
        const key = args[0];
        if (!key) {
            error('Usage: adi config get <key>');
            return;
        }

        const config = loadConfig();
        if (key in config) {
            log(config[key]);
        } else {
            info(`${key} is not set`);
        }
    },

    async configShow() {
        const config = loadConfig();
        log(`${colors.bright}Configuration:${colors.reset}`);
        log(`  API URL: ${config.apiUrl || DEFAULT_API_URL}`);
        log(`  Logged in: ${config.token ? 'Yes' : 'No'}`);
        if (config.user) {
            log(`  User: ${config.user.email}`);
        }
        log(`  Config file: ${CONFIG_FILE}`);
    },

    // Version command
    async version() {
        log('After Dark Identity CLI v1.0.0');
        log('https://identity.afterdarksys.com');
    },

    // Help command
    async help() {
        log(`${colors.bright}After Dark Identity CLI${colors.reset}`);
        log('');
        log('Usage: adi <command> [options]');
        log('');
        log('Commands:');
        log('  login              - Log in to After Dark Identity');
        log('  logout             - Log out');
        log('  whoami             - Show current user');
        log('');
        log('  passkeys <cmd>     - Manage passkeys');
        log('  did <cmd>          - Manage DIDs');
        log('  credentials <cmd>  - Manage verifiable credentials');
        log('');
        log('  config <cmd>       - Manage configuration');
        log('  version            - Show version');
        log('  help               - Show this help');
        log('');
        log('Run "adi <command>" for command-specific help.');
    }
};

// ============================================================================
// MAIN
// ============================================================================

async function main() {
    const args = process.argv.slice(2);
    const command = args[0] || 'help';
    const commandArgs = args.slice(1);

    if (commands[command]) {
        await commands[command](commandArgs);
    } else {
        error(`Unknown command: ${command}`);
        await commands.help();
        process.exit(1);
    }
}

main().catch(e => {
    error(e.message);
    process.exit(1);
});
