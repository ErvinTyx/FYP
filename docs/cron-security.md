# Cron Endpoint Security

## Overview

The `/api/cron/check-overdue` endpoint is **protected by authentication** to prevent unauthorized access. This document explains the security measures and how to configure them.

## Security Status

✅ **SECURED** - The endpoint requires authentication and cannot be called by anyone without proper credentials.

## Authentication Methods

The endpoint supports three authentication methods (in order of preference):

### 1. Bearer Token (Recommended)
Send the secret in the `Authorization` header:
```
Authorization: Bearer <CRON_SECRET>
```

**Example:**
```bash
curl -X POST https://your-domain.com/api/cron/check-overdue \
  -H "Authorization: Bearer your-secret-token-here"
```

### 2. Custom Header
Send the secret in a custom header:
```
X-Cron-Secret: <CRON_SECRET>
```

**Example:**
```bash
curl -X POST https://your-domain.com/api/cron/check-overdue \
  -H "X-Cron-Secret: your-secret-token-here"
```

### 3. Localhost Access (Internal Systems Only)
If `CRON_ALLOW_LOCALHOST=true` is set, requests from localhost don't require authentication.

**⚠️ Warning:** Only enable this if your server is not publicly accessible or is behind a firewall.

## Configuration

### Required Environment Variable

```bash
CRON_SECRET=your-secure-random-token-here
```

**Generate a secure token:**
```bash
# Using openssl
openssl rand -hex 32

# Or using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Optional Environment Variables

```bash
# Allow localhost requests without authentication (for internal systems)
CRON_ALLOW_LOCALHOST=true

# Allow requests without secret in development mode only
CRON_ALLOW_NO_SECRET=true  # Development only!
```

## Access Control

| Scenario | Authentication Required | Notes |
|----------|----------------------|-------|
| External cron service | ✅ Yes | Must provide `CRON_SECRET` |
| Vercel Cron | ✅ Yes | Must provide `CRON_SECRET` |
| System crontab (curl) | ✅ Yes | Must provide `CRON_SECRET` |
| Internal system (localhost) | ⚠️ Optional | Only if `CRON_ALLOW_LOCALHOST=true` |
| Public internet | ✅ Yes | Always required |

## Security Best Practices

1. **Use a strong secret**: Minimum 32 characters, random and unpredictable
2. **Store securely**: Keep `CRON_SECRET` in `.env` file (already in `.gitignore`)
3. **Never expose**: Don't commit secrets to version control
4. **Rotate periodically**: Change the secret if compromised or every 6-12 months
5. **Use HTTPS**: Always use HTTPS in production to protect secrets in transit
6. **Monitor access**: Check logs for unauthorized access attempts
7. **Limit localhost access**: Only enable `CRON_ALLOW_LOCALHOST` if necessary

## Testing Authentication

### Test with Bearer Token
```bash
# Should succeed
curl -X POST http://localhost:3000/api/cron/check-overdue \
  -H "Authorization: Bearer your-CRON_SECRET-here"

# Should fail (401 Unauthorized)
curl -X POST http://localhost:3000/api/cron/check-overdue \
  -H "Authorization: Bearer wrong-secret"
```

### Test with Custom Header
```bash
# Should succeed
curl -X POST http://localhost:3000/api/cron/check-overdue \
  -H "X-Cron-Secret: your-CRON_SECRET-here"

# Should fail (401 Unauthorized)
curl -X POST http://localhost:3000/api/cron/check-overdue \
  -H "X-Cron-Secret: wrong-secret"
```

### Test Health Check (No Auth Required)
```bash
# GET endpoint doesn't require auth, shows configuration status
curl http://localhost:3000/api/cron/check-overdue
```

## Error Responses

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Unauthorized",
  "error": "Invalid or missing authentication. This endpoint requires a valid CRON_SECRET."
}
```

**Causes:**
- Missing `CRON_SECRET` in environment variables
- Wrong secret provided
- No authentication header sent
- Request not from localhost when `CRON_ALLOW_LOCALHOST` is required

## Internal System Integration

If you need to call this endpoint from your internal system (e.g., another service on the same server), you have two options:

### Option 1: Use the Secret (Recommended)
```typescript
// In your internal system
const response = await fetch('http://localhost:3000/api/cron/check-overdue', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.CRON_SECRET}`,
  },
});
```

### Option 2: Enable Localhost Access
```bash
# In .env
CRON_ALLOW_LOCALHOST=true
```

Then internal calls from localhost won't need authentication:
```typescript
// In your internal system (from localhost)
const response = await fetch('http://localhost:3000/api/cron/check-overdue', {
  method: 'POST',
  // No auth header needed
});
```

**⚠️ Security Note:** Only use Option 2 if:
- Your server is not publicly accessible, OR
- You're behind a firewall, OR
- You're in a private network

## Summary

✅ **The endpoint is secure** - It cannot be called without proper authentication
✅ **Multiple auth methods** - Supports Bearer token, custom header, and optional localhost access
✅ **Configurable** - Easy to set up with environment variables
✅ **Flexible** - Works with external cron services and internal systems

For setup instructions, see [cron-setup.md](./cron-setup.md).
