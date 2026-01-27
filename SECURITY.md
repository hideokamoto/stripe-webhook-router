# Security Policy

## Supported Versions

We release security updates for the following versions of Tayori:

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

We take the security of Tayori seriously. If you believe you have found a security vulnerability, please report it to us as described below.

### Where to Report

**Please do NOT report security vulnerabilities through public GitHub issues.**

Instead, please report security vulnerabilities by:

1. **Opening a security advisory** on GitHub:
   - Go to the [Security Advisories](https://github.com/hideokamoto/stripe-webhook-router/security/advisories) page
   - Click "Report a vulnerability"
   - Fill out the form with details about the vulnerability

2. **Email** (if you prefer private disclosure):
   - Send an email to the repository maintainer through their GitHub profile
   - Include "SECURITY" in the subject line
   - Provide detailed information about the vulnerability

### What to Include

Please include the following information in your report:

- **Type of vulnerability** (e.g., XSS, SQL injection, remote code execution)
- **Full paths of affected source files**
- **Location of the affected code** (tag/branch/commit or direct URL)
- **Step-by-step instructions to reproduce the issue**
- **Proof-of-concept or exploit code** (if possible)
- **Impact of the vulnerability** (what an attacker could do)
- **Any potential mitigations** you've identified

### What to Expect

- **Acknowledgment**: We will acknowledge receipt of your vulnerability report within 48 hours
- **Updates**: We will send you regular updates about our progress
- **Resolution timeframe**: We aim to resolve critical vulnerabilities within 30 days
- **Disclosure**: We will work with you to understand the issue and coordinate public disclosure

### Security Best Practices for Users

When using Tayori in production:

1. **Webhook Signature Verification**
   - Always enable signature verification for webhooks
   - Keep your webhook secrets secure and rotate them regularly
   - Never commit webhook secrets to version control

2. **Environment Variables**
   - Store sensitive configuration in environment variables
   - Use proper secret management solutions in production
   - Follow the principle of least privilege for API keys

3. **HTTPS Only**
   - Always use HTTPS endpoints for webhook handlers
   - Validate SSL/TLS certificates

4. **Input Validation**
   - Use the built-in validation features (e.g., `@tayori/zod`)
   - Validate all webhook payloads before processing
   - Implement rate limiting on webhook endpoints

5. **Error Handling**
   - Don't expose sensitive information in error messages
   - Log security-relevant events for monitoring
   - Implement proper error recovery mechanisms

6. **Dependencies**
   - Keep all dependencies up to date
   - Regularly audit dependencies for vulnerabilities
   - Use `pnpm audit` to check for known vulnerabilities

### Known Security Considerations

#### Webhook Secret Management

Tayori packages that handle webhook verification (e.g., `@tayori/stripe`) require webhook secrets. These secrets must be:

- Stored securely (use environment variables or secret management systems)
- Never committed to version control
- Rotated periodically
- Unique per environment (development, staging, production)

#### Type Safety

Tayori uses TypeScript for type safety, but runtime validation is still necessary:

- Use `@tayori/zod` for runtime validation of webhook payloads
- Don't rely solely on TypeScript types for security
- Validate all external input before processing

#### Adapter-Specific Security

Different adapters may have specific security considerations:

- **Express**: Ensure body parsing middleware is configured correctly
- **Lambda**: Review IAM permissions for Lambda functions
- **EventBridge**: Validate EventBridge event patterns and sources
- **Hono**: Review Hono middleware configuration

## Security Updates

Security updates will be published:

1. As GitHub Security Advisories
2. In release notes with `[SECURITY]` prefix
3. With detailed upgrade instructions

Subscribe to repository notifications to stay informed about security updates.

## Attribution

We appreciate security researchers who responsibly disclose vulnerabilities. With your permission, we will:

- Acknowledge your contribution in the security advisory
- Include your name in the release notes (unless you prefer to remain anonymous)
- Provide a reference link to your website or GitHub profile

Thank you for helping keep Tayori and its users secure!
