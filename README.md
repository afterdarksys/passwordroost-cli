# proost - PasswordRoost CLI

Command-line interface for the [PasswordRoost API](https://passwordroost.com).

## Installation

```bash
# Via npm
npm install -g @passwordroost/cli

# Via script (recommended)
curl -sSL https://get.passwordroost.com/cli.sh | bash
```

## Configuration

```bash
# Set your API key
proost config set api_key your_api_key_here

# View configuration
proost config list
```

## Usage

### Breach Checking

```bash
# Check a password for breaches
proost breach check "password123"

# Check an email address for known exposure
proost breach email you@example.com

# Return the normalized API response
proost breach email you@example.com --json
```

### Rainbow Table Lookups

```bash
# Look up a hash
proost rainbow lookup 5f4dcc3b5aa765d61d8327deb882cf99 --algorithm md5

# Check if a password is in rainbow tables
proost rainbow check "password123"

# List supported algorithms
proost rainbow algorithms
```

### GPU Cracking

```bash
# Create a cracking job
proost crack create \
  --type wpa2 \
  --file capture.pcap \
  --gpu RTX4090 \
  --hours 4

# Check job status
proost crack status job_abc123

# Cancel a job
proost crack cancel job_abc123

# List your jobs
proost crack list --email you@example.com
```

### Breach Monitoring

```bash
# Create a monitoring job
proost monitor create "password123" --email you@example.com

# Check job status
proost monitor status job_abc123

# List all monitoring jobs
proost monitor list you@example.com
```

Crack and monitoring creation responses contain one-time management tokens.
The CLI saves those tokens automatically and sends them in `X-Job-Token` for
later status and cancellation requests. The config file and token store are
written with owner-only permissions on macOS and Linux.

The self-hosted Pwned Passwords provider, XposedOrNot provider selection, and
MailAccess service are backend implementation details; they do not require
provider credentials in the CLI. MailAccess deep investigations will be added
only after the public PasswordRoast API exposes consent- and ownership-aware
endpoints for them.

## Help

```bash
# Get help for any command
proost --help
proost breach --help
proost crack create --help
```

## Documentation

Full documentation at [developer.passwordroost.com](https://developer.passwordroost.com)

## License

MIT License
