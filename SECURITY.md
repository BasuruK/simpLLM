# Security Policy

## Supported Versions

We currently support the following versions with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 0.0.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability in Simple Invoice Scanner, please report it by emailing:

**Email:** Basuru.Balasuriya@ifs.com

Please include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

**Do not** create a public GitHub issue for security vulnerabilities.

### Response Time

- We will acknowledge receipt within 48 hours
- We aim to provide an initial assessment within 5 business days
- Security patches will be released as soon as possible

## Security Measures

This application implements the following security measures:

### Dependency Management
- **Automated Scanning**: Dependabot monitors for vulnerabilities weekly
- **CI/CD Audits**: GitHub Actions runs `npm audit` on every commit
- **Locked Dependencies**: `package-lock.json` ensures reproducible builds

### Code Security
- **No Credentials in Code**: API keys stored in secure electron-store
- **Encrypted Storage**: User credentials encrypted with AES-256
- **Sandboxed Rendering**: Electron renderer process runs in sandbox mode
- **CSP Headers**: Content Security Policy prevents XSS attacks

### Auto-Update Security
- **Code Signing**: (Planned) Installers will be digitally signed
- **HTTPS Only**: Updates downloaded over secure connection
- **Integrity Checks**: electron-updater verifies file signatures

### Data Privacy
- **No Telemetry**: Application does not collect or transmit user data
- **Local Processing**: All invoice processing happens locally
- **No Cloud Storage**: Files and data remain on user's machine

## Security Best Practices for Users

1. **Download from Official Sources**: Only download from GitHub releases
2. **Verify Checksums**: Check file hashes before installation
3. **Keep Updated**: Enable automatic updates for security patches
4. **Protect API Keys**: Never share your OpenAI API key
5. **Use Strong Passwords**: If setting user passwords, use strong credentials

## Third-Party Dependencies

This application relies on the following critical dependencies:

- **OpenAI SDK**: For AI-powered invoice processing
- **Electron**: Application framework
- **electron-updater**: Automatic update mechanism
- **crypto-js**: Encryption library

All dependencies are regularly audited for known vulnerabilities.

## Vulnerability Disclosure Timeline

When a vulnerability is confirmed:

1. **Day 0**: Acknowledgment sent to reporter
2. **Day 1-5**: Assessment and fix development
3. **Day 6-10**: Testing and verification
4. **Day 11+**: Security patch release
5. **Day 14+**: Public disclosure (after patch deployment)

## Security Updates

Security updates are released as patch versions (e.g., 0.0.4-1, 0.0.5).

Users will receive automatic update notifications through the application.

---

**Last Updated:** October 31, 2025
