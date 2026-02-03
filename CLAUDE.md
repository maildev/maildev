# MailDev + Claude Integration Guide

**MailDev 3.0** includes first-class support for Claude via the Model Context Protocol (MCP), enabling you to interact with your development emails using natural language.

---

## What is MCP?

The Model Context Protocol (MCP) is Anthropic's standard for connecting AI assistants like Claude to external data sources and tools. MailDev's MCP server allows Claude to:

- Search and retrieve emails
- Analyze email content
- Extract verification links and tokens
- Monitor email delivery
- Manage your development inbox

---

## Quick Start

### 1. Install MailDev 3.0 with MCP Support

```bash
# Via npm
npm install -g maildev@3.0.0

# Via Homebrew (recommended for macOS)
brew install maildev

# Via Docker
docker pull maildev/maildev:3.0.0
```

### 2. Start MailDev

MailDev 3.0 offers two MCP transport modes:

#### Option A: Integrated HTTP Transport (Recommended)

The MCP server is built directly into MailDev's API server at the `/mcp` endpoint:

```bash
# Start MailDev with MCP enabled
maildev --mcp

# Or with configuration file
maildev --config maildev.config.ts
```

By default:
- **SMTP Server**: `localhost:1025`
- **Web UI**: `http://localhost:1080`
- **MCP Endpoint**: `http://localhost:1080/mcp`

#### Option B: Standalone stdio Transport

For Claude Desktop's stdio mode, use the dedicated MCP CLI:

```bash
# Run the MCP server in stdio mode (used by Claude Desktop)
maildev-mcp
```

### 3. Configure Claude Desktop

Edit your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

**Linux**: `~/.config/Claude/claude_desktop_config.json`

#### For stdio mode (standalone):

```json
{
  "mcpServers": {
    "maildev": {
      "command": "maildev-mcp",
      "env": {
        "MAILDEV_API_URL": "http://localhost:1080"
      }
    }
  }
}
```

#### For HTTP mode (integrated):

```json
{
  "mcpServers": {
    "maildev": {
      "url": "http://localhost:1080/mcp"
    }
  }
}
```

### 4. Restart Claude Desktop

After updating the config, restart Claude Desktop to load the MCP server.

---

## Usage Examples

### Check for Emails

```
You: "Claude, did I receive any emails in the last 5 minutes?"

Claude: "Let me check your MailDev inbox..."
        [uses maildev_search_emails with time filter]
        "Yes, you received 2 emails:
        1. 'Welcome to Acme Corp' from noreply@acme.com at 2:34 PM
        2. 'Password Reset Request' from security@acme.com at 2:35 PM"
```

### Extract Verification Links

```
You: "Claude, get me the verification link from the signup email"

Claude: [searches for signup email]
        [retrieves full email content]
        [parses HTML/text for verification link]
        "Here's your verification link:
        https://app.acme.com/verify?token=abc123xyz

        This link expires in 24 hours according to the email."
```

### Analyze Email Content

```
You: "Claude, summarize the order confirmation email"

Claude: [retrieves email by ID or search]
        "Here's a summary of your order confirmation:

        Order #12345
        - 2x Widget Pro ($49.99 each)
        - 1x Premium Support ($29.99)
        Total: $129.97

        Estimated delivery: January 20-22, 2026
        Tracking: Available in 1-2 business days"
```

### Verify Email Delivery

```
You: "Claude, did the password reset email go out to user@test.com?"

Claude: [searches emails with to:user@test.com and subject containing 'password']
        "Yes, a password reset email was sent to user@test.com at 2:45 PM.
        Subject: 'Reset Your Password'
        From: noreply@yourapp.com

        The email contains a reset token that expires in 1 hour."
```

### Test Email Workflows

```
You: "Claude, I'm going to trigger a signup flow. Let me know when the welcome email arrives."

Claude: [monitors for new emails]
        "I'll watch for the welcome email. Go ahead and trigger the signup."

You: [triggers signup in your app]

Claude: "✓ Welcome email received at 3:02 PM
        To: newuser@test.com
        Subject: 'Welcome to Acme Corp!'

        The email includes:
        - Welcome message
        - Getting started guide link
        - Account verification button

        Everything looks good!"
```

### Clean Up Development Emails

```
You: "Claude, delete the old test emails"

Claude: [uses maildev_search_emails to find old emails]
        "I found 5 test emails older than yesterday. I'll delete them one by one."
        [uses maildev_delete_email for each]
        "✓ Deleted 5 emails from your MailDev inbox."
```

### Get Email Attachments

```
You: "Claude, download the PDF attachment from the invoice email"

Claude: [searches for invoice email]
        [uses maildev_get_attachment]
        "Here's the attachment 'invoice.pdf' (45KB).
        I've extracted the base64 content for you."
```

---

## Available MCP Tools

MailDev's MCP server exposes the following 5 tools to Claude:

### `maildev_search_emails`
Search emails with flexible filters.

**Parameters:**
- `query` (optional): Text search across subject, from, to, body
- `from` (optional): Filter by sender email address
- `to` (optional): Filter by recipient email address
- `subject` (optional): Filter by subject line
- `hasAttachment` (optional): Filter emails with attachments
- `isUnread` (optional): Filter by read/unread status
- `since` (optional): Filter emails after timestamp (ISO 8601)
- `until` (optional): Filter emails before timestamp (ISO 8601)
- `limit` (optional): Maximum results (default: 20)

**Returns:** Formatted list of matching emails with metadata

### `maildev_get_email`
Retrieve full email content by ID.

**Parameters:**
- `id` (required): Email ID

**Returns:** Complete email with subject, from, to, date, content, and attachments

### `maildev_get_latest_email`
Get the most recently received email(s).

**Parameters:**
- `count` (optional): Number of recent emails (default: 1)

**Returns:** Full content of the latest email(s)

### `maildev_delete_email`
Delete a specific email.

**Parameters:**
- `id` (required): Email ID to delete

**Returns:** Success confirmation

### `maildev_get_attachment`
Download an email attachment.

**Parameters:**
- `emailId` (required): Email ID
- `filename` (required): Attachment filename

**Returns:** Attachment content (base64 encoded)

---

## Available MCP Resources

Resources provide Claude with direct access to data:

### `maildev://emails`
Access to all emails in the inbox.

**URI:** `maildev://emails`

**MIME Type:** `application/json`

### `maildev://email/{id}`
Access to a specific email.

**URI:** `maildev://email/{id}`

**MIME Type:** `message/rfc822` or `application/json`

### `maildev://stats`
Access to server statistics.

**URI:** `maildev://stats`

**MIME Type:** `application/json`

---

## Available MCP Prompts

Prompts help Claude understand common email testing scenarios:

### `verify-signup-email`
**Description:** Check if a signup/verification email was received and extract the verification link.

**Usage:**
```
You: "Use the verify-signup-email prompt for user@test.com"
```

### `check-password-reset`
**Description:** Find password reset email and extract the reset token/link.

**Usage:**
```
You: "Use the check-password-reset prompt for user@test.com"
```

### `analyze-email-content`
**Description:** Analyze email content for key information (prices, dates, links, etc.)

**Usage:**
```
You: "Use the analyze-email-content prompt for the latest email"
```

### `monitor-email-delivery`
**Description:** Watch for an expected email and verify its contents.

**Usage:**
```
You: "Use the monitor-email-delivery prompt and watch for a welcome email to user@test.com"
```

---

## Configuration Options

### Environment Variables

Configure the standalone MCP server (`maildev-mcp`) with environment variables:

```bash
# MailDev API URL (required for stdio mode)
MAILDEV_API_URL=http://localhost:1080
```

### Programmatic Configuration

When using the integrated HTTP transport, configure MCP via the API server options:

```typescript
import { createAPIServer } from '@maildev/api'

const server = createAPIServer({
  port: 1080,
  storage,
  mcp: {
    enabled: true  // Enables /mcp endpoint
  }
})
```

### Architecture

MailDev 3.0 offers two MCP deployment modes:

#### Integrated HTTP Transport
- MCP server runs inside `@maildev/api` at `/mcp`
- Direct storage access (no HTTP round-trips)
- Session management via `mcp-session-id` header
- Best for: HTTP-capable MCP clients

#### Standalone stdio Transport
- Runs via `maildev-mcp` CLI command
- Communicates with MailDev API over HTTP
- Best for: Claude Desktop and other stdio-based clients

---

## Advanced Usage

### Custom MCP Workflows

Create custom workflows combining multiple MCP tools:

```
You: "Claude, set up a workflow to test the user registration flow:
      1. Monitor for signup email
      2. Extract and visit verification link
      3. Check for welcome email
      4. Summarize the onboarding emails"

Claude: [creates multi-step workflow]
        "I'll monitor your MailDev inbox. Trigger the signup when ready."

        [User triggers signup]

        "Step 1: ✓ Signup email received (2:15 PM)
         - Verification link: https://app.com/verify?token=xyz

         Step 2: Should I simulate clicking the verification link?

         [User confirms]

         Step 3: ✓ Welcome email received (2:16 PM)

         Step 4: Summary of onboarding emails:
         - Signup email confirms registration
         - Welcome email includes getting started guide
         - Both emails have proper branding
         - All links are functional

         Registration flow test complete!"
```

### Integration with Testing Frameworks

Use Claude + MailDev MCP in your test scripts:

```typescript
// In your E2E tests
test('User can sign up and verify email', async () => {
  // Trigger signup in your app
  await page.goto('/signup')
  await page.fill('[name="email"]', 'test@example.com')
  await page.click('[type="submit"]')

  // Ask Claude to verify email via MCP
  const verification = await claude.ask(
    "Check if test@example.com received a verification email and extract the token"
  )

  // Use the token in your test
  await page.goto(verification.link)
  expect(await page.textContent('.success')).toContain('Email verified')
})
```

### Debugging Email Issues

Use Claude to debug email problems:

```
You: "Claude, I'm not receiving password reset emails. Can you help debug?"

Claude: "Let me investigate. I'll check:
        1. If MailDev is receiving any emails
        2. If password reset emails are being sent
        3. The email content and configuration

        [uses maildev_search_emails to check recent emails]
        [searches for password reset attempts]

        I found the issue:
        - MailDev is running and receiving emails
        - Password reset emails ARE being sent
        - BUT: They're going to 'noreply@localhost' instead of user emails

        Check your application's email configuration - the recipient
        address might be hardcoded or incorrectly configured."
```

---

## Security Considerations

### Development Only

⚠️ **MailDev is designed for development and testing only.** Do not use in production.

### MCP Server Security

When running MCP server:

1. **Restrict network access**: Bind to localhost only
   ```bash
   maildev --host 127.0.0.1
   ```

2. **Use stdio mode** when possible (more secure than HTTP)

3. **Don't expose MCP server** to the internet

4. **Use in trusted environments only**: The MCP server has full access to email content

### Email Content Privacy

- Emails may contain sensitive test data
- Claude has access to full email content via MCP
- Use in trusted environments only
- Clear emails regularly: `maildev clear-all`

---

## Troubleshooting

### MCP Server Not Connecting

**Problem:** Claude can't connect to MailDev MCP server

**Solutions:**
1. Verify MailDev is running: `maildev --status`
2. Check MCP config in Claude Desktop
3. Restart Claude Desktop
4. Check logs: `maildev --log-level debug`

### Tool Execution Fails

**Problem:** MCP tools return errors

**Solutions:**
1. Verify MailDev API is accessible: `curl http://localhost:1080/health`
2. Check API key if authentication is enabled
3. Review tool parameters in Claude's output
4. Check MailDev logs: `maildev logs --tail 50`

### Slow Performance

**Problem:** MCP operations are slow

**Solutions:**
1. Limit search results: Use smaller `limit` values
2. Clear old emails: `maildev clear-all`
3. Use database storage instead of in-memory
4. Add indexes to frequently searched fields

---

## Examples by Use Case

### Testing User Registration

```
You: "Claude, I'm testing user registration. Let me know when the verification email arrives."

[Trigger registration in your app]

Claude: "✓ Verification email received for newuser@test.com
        Link: https://app.com/verify?token=abc123
        Expires: 24 hours"
```

### Testing Password Reset

```
You: "Claude, verify the password reset flow works correctly"

Claude: "I'll help test the password reset flow. Here's what I'll check:
        1. Request password reset in your app
        2. Verify email arrives
        3. Check reset link is present and valid
        4. Verify expiration time is set

        Go ahead and request a password reset."

[User triggers password reset]

Claude: "✓ Password reset email received (3 seconds after request)
        To: user@test.com
        Subject: Reset Your Password

        ✓ Reset link found: https://app.com/reset?token=xyz789
        ✓ Token expiration: 1 hour
        ✓ Email includes security notice

        Password reset flow verified successfully!"
```

### Testing Order Confirmation

```
You: "Claude, check the order confirmation email and verify all items are listed"

Claude: [searches for latest order email]
        [analyzes content]

        "Order confirmation verified:

        Order #12345 to customer@test.com

        Items:
        ✓ 2x Widget Pro @ $49.99 = $99.98
        ✓ 1x Gadget Basic @ $29.99 = $29.99
        ✓ Shipping: $10.00
        ✓ Tax: $14.00
        ✓ Total: $153.97

        ✓ Payment method listed (ending in 4242)
        ✓ Shipping address confirmed
        ✓ Tracking number present
        ✓ Customer support contact info included

        All items accounted for!"
```

### Monitoring Email Queue

```
You: "Claude, monitor my MailDev inbox and alert me to any errors in email content"

Claude: "I'll watch for incoming emails and check for:
        - Broken links
        - Missing required content
        - Formatting issues
        - Incorrect recipient addresses

        Monitoring started..."

[30 minutes later]

Claude: "⚠️ Alert: Email received with potential issue

        Email: 'Weekly Newsletter' at 3:45 PM
        Issue: Contains broken link to https://app.com/blog/post-123
        (Link returns 404)

        All other emails (23 total) look good."
```

---

## Best Practices

### 1. Clear Emails Regularly

```bash
# Daily cleanup
maildev clear-all --before "24 hours ago"
```

### 2. Use Descriptive Test Email Subjects

```javascript
// Good
subject: '[TEST] User Registration - john@test.com'

// Bad
subject: 'Welcome'
```

### 3. Leverage Claude's Context

```
You: "Claude, remember this email format for future signup tests"

Claude: "I'll remember that signup emails should include:
        - Verification link in the format https://app.com/verify?token={token}
        - 24 hour expiration notice
        - Welcome message
        - Getting started guide link

        I'll validate these elements in future tests."
```

### 4. Combine with Application Logs

```
You: "Claude, cross-reference the MailDev emails with the application logs to find why emails are delayed"

Claude: [checks email timestamps]
        [asks for application logs]
        "Based on the logs and email timestamps, I found a 5-second delay
        between email queue insertion and SMTP delivery. This is caused by
        the queue worker polling interval. Consider reducing it from 5s to 1s."
```

---

## Resources

- **MailDev Documentation**: https://maildev.github.io/maildev/
- **MCP Specification**: https://modelcontextprotocol.io
- **Claude Desktop**: https://claude.ai/download
- **GitHub Issues**: https://github.com/maildev/maildev/issues

---

## Changelog

### MailDev 3.0.0 (2026)
- Initial MCP server implementation
- 5 MCP tools: search, get, get_latest, delete, get_attachment
- 3 MCP resources: emails, stats, email/{id}
- 4 MCP prompts for common workflows
- Dual transport support:
  - Integrated HTTP transport at `/mcp` endpoint
  - Standalone stdio transport via `maildev-mcp`
- Direct storage access for HTTP transport (no round-trips)
- Session management with `mcp-session-id` header

---

**License:** MIT

**Maintained by:** MailDev Contributors
