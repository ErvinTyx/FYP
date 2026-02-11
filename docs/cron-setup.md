# Cron Job Setup for Overdue Checks

This document explains how to set up automated overdue checks for deposits, additional charges, and monthly rental invoices.

## Overview

The system checks for overdue items and:
- **Deposits**: Updates status from "Pending Payment" to "Overdue" when past due date
- **Additional Charges**: Updates status from "pending_payment" to "overdue" when past due date
- **Monthly Rental Invoices**: Updates status to "Overdue" and calculates/applies default interest charges

## Setup Options

### Option 1: Local Crontab (Recommended for Self-Hosted)

#### Step 1: Make the script executable
```bash
chmod +x scripts/check-overdue.ts
```

#### Step 2: Test the script manually
```bash
cd /path/to/project
npx tsx scripts/check-overdue.ts
```

#### Step 3: Set up crontab
Edit your crontab:
```bash
crontab -e
```

Add one of the following entries:

**Run daily at midnight:**
```cron
0 0 * * * cd /home/ervin/Documents/Power\ Metal\ \&\ Steel && npx tsx scripts/check-overdue.ts >> logs/overdue-check.log 2>&1
```

**Run every 6 hours:**
```cron
0 */6 * * * cd /home/ervin/Documents/Power\ Metal\ \&\ Steel && npx tsx scripts/check-overdue.ts >> logs/overdue-check.log 2>&1
```

**Run every hour:**
```cron
0 * * * * cd /home/ervin/Documents/Power\ Metal\ \&\ Steel && npx tsx scripts/check-overdue.ts >> logs/overdue-check.log 2>&1
```

**Note:** Adjust the path `/home/ervin/Documents/Power\ Metal\ \&\ Steel` to match your actual project path.

#### Step 4: Verify crontab is set
```bash
crontab -l
```

#### Step 5: Check logs
```bash
tail -f logs/overdue-check.log
```

### Option 2: API Endpoint (For Cloud Deployments)

If your application is deployed (e.g., Vercel, AWS, etc.), you can use the API endpoint instead.

#### Step 1: Set up external cron service

Use a service like:
- [cron-job.org](https://cron-job.org)
- [EasyCron](https://www.easycron.com)
- [Vercel Cron](https://vercel.com/docs/cron-jobs) (if using Vercel)

#### Step 2: Set up authentication

**IMPORTANT:** This endpoint requires authentication. Set up a secret token:

1. Add to your `.env` file:
   ```bash
   CRON_SECRET=your-secure-random-token-here
   ```

2. Generate a secure token:
   ```bash
   # Using openssl
   openssl rand -hex 32
   
   # Or using Node.js
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

3. **Optional:** For local/internal system calls, you can enable localhost access:
   ```bash
   CRON_ALLOW_LOCALHOST=true
   ```

#### Step 3: Configure the cron job

**URL:** `https://your-domain.com/api/cron/check-overdue`

**Method:** POST

**Headers (choose one method):**
- Option 1: `Authorization: Bearer <CRON_SECRET>`
- Option 2: `X-Cron-Secret: <CRON_SECRET>`

**Schedule:** Daily at midnight (or your preferred schedule)

**Example curl command:**
```bash
curl -X POST https://your-domain.com/api/cron/check-overdue \
  -H "Authorization: Bearer your-secure-random-token-here"
```

Or using the header method:
```bash
curl -X POST https://your-domain.com/api/cron/check-overdue \
  -H "X-Cron-Secret: your-secure-random-token-here"
```

#### Step 3: Test the endpoint
```bash
curl -X POST https://your-domain.com/api/cron/check-overdue
```

### Option 3: Vercel Cron (If Deployed on Vercel)

If you're using Vercel, you can use their built-in cron job feature.

#### Step 1: Create `vercel.json` in project root
```json
{
  "crons": [
    {
      "path": "/api/cron/check-overdue",
      "schedule": "0 0 * * *"
    }
  ]
}
```

#### Step 2: Deploy to Vercel
The cron job will automatically be set up.

## How It Works

### Deposits
- Finds all deposits with status "Pending Payment" or "Rejected" where `dueDate < now`
- Updates status to "Overdue"

### Additional Charges
- Finds all additional charges with status "pending_payment" or "rejected" where `dueDate < now`
- Updates status to "overdue"

**Important:** The "overdue" status may need to be added to your schema. The UI currently handles overdue display via the `isOverdue` prop, but for consistency with deposits and monthly rentals, you may want to add "overdue" as a valid status:

1. Update `prisma/schema.prisma` - change the comment to include "overdue":
   ```prisma
   status String @default("pending_payment") // pending_payment, pending_approval, approved, rejected, overdue
   ```

2. Update `src/types/additionalCharge.ts` to include "Overdue" in the type:
   ```typescript
   export type AdditionalChargeStatus =
     | "Pending Payment"
     | "Pending Approval"
     | "Paid"
     | "Rejected"
     | "Overdue";
   ```

3. Update the status mapping in `src/components/additional-charges/AdditionalChargesDetail.tsx`:
   ```typescript
   const API_STATUS_TO_DISPLAY: Record<string, AdditionalCharge["status"]> = {
     pending_payment: "Pending Payment",
     pending_approval: "Pending Approval",
     paid: "Paid",
     rejected: "Rejected",
     overdue: "Overdue",  // Add this line
   };
   ```

**Alternative:** If you prefer not to add a new status, you can modify the script to keep the status as "pending_payment" and let the UI handle overdue display via the `isOverdue` prop calculation.

### Monthly Rental Invoices
- Finds all invoices with status "Pending Payment" or "Rejected" where `dueDate < now`
- For each invoice:
  - Gets the `defaultInterest` rate from the associated agreement (defaults to 1.5% if not set)
  - Calculates overdue charges: `baseAmount × (defaultInterest / 100) × monthsLate`
  - Updates status to "Overdue"
  - Updates `overdueCharges` field
  - Updates `totalAmount` = `baseAmount + overdueCharges`

**Interest Calculation:**
- Uses 30-day months for calculation
- Rounds up to the nearest month (e.g., 31 days = 2 months)
- Formula: `baseAmount × (interestRate / 100) × monthsLate`

## Logging

The script logs all activities:
- Timestamp of execution
- Number of items updated per category
- Summary of total updates
- Any errors encountered

Logs are written to:
- Console output (if run manually)
- `logs/overdue-check.log` (if using crontab with redirection)

## Troubleshooting

### Script not running
1. Check crontab is installed: `which crontab`
2. Check cron service is running: `systemctl status cron` (Linux) or `service cron status`
3. Check logs: `tail -f logs/overdue-check.log`
4. Verify path in crontab is correct
5. Check file permissions: `ls -la scripts/check-overdue.ts`

### Database connection errors
1. Verify `.env` file has correct database credentials
2. Test database connection: `npx tsx scripts/test-db-connection.ts`
3. Check database is accessible from the server

### No items being updated
1. Verify there are actually overdue items in the database
2. Check the status values match exactly (case-sensitive)
3. Verify due dates are in the past
4. Run the script manually with verbose output

### API endpoint returns 401
1. **Verify `CRON_SECRET` is set**: Check your environment variables
   ```bash
   echo $CRON_SECRET  # Should show your secret
   ```

2. **Check the authorization header**: Ensure your cron service is sending:
   - `Authorization: Bearer <CRON_SECRET>` OR
   - `X-Cron-Secret: <CRON_SECRET>`

3. **Verify the secret matches**: The secret in your cron service must exactly match `CRON_SECRET` in your `.env` file

4. **For localhost calls**: If calling from internal system, set `CRON_ALLOW_LOCALHOST=true` in `.env`

5. **Test manually**:
   ```bash
   # Test with Bearer token
   curl -X POST http://localhost:3000/api/cron/check-overdue \
     -H "Authorization: Bearer your-secret-here"
   
   # Test with header
   curl -X POST http://localhost:3000/api/cron/check-overdue \
     -H "X-Cron-Secret: your-secret-here"
   ```

## Manual Execution

You can always run the check manually:

```bash
# Using the script (recommended for local testing)
npx tsx scripts/check-overdue.ts

# Using the API endpoint (requires authentication)
curl -X POST http://localhost:3000/api/cron/check-overdue \
  -H "Authorization: Bearer your-CRON_SECRET-here"

# Or using the header method
curl -X POST http://localhost:3000/api/cron/check-overdue \
  -H "X-Cron-Secret: your-CRON_SECRET-here"
```

**Note:** If `CRON_ALLOW_LOCALHOST=true` is set, localhost requests don't require authentication.

## Security Notes

### Authentication Methods

The endpoint supports three authentication methods:

1. **Bearer Token** (Recommended for external services):
   ```
   Authorization: Bearer <CRON_SECRET>
   ```

2. **Custom Header** (Alternative method):
   ```
   X-Cron-Secret: <CRON_SECRET>
   ```

3. **Localhost Access** (For internal systems only):
   - Set `CRON_ALLOW_LOCALHOST=true` in `.env`
   - Only works for requests from localhost/127.0.0.1
   - **Warning:** Only enable this if your server is not publicly accessible

### Security Best Practices

1. **Use a strong secret**: Generate a random 32+ character token
2. **Never commit secrets**: Keep `CRON_SECRET` in `.env` (already in `.gitignore`)
3. **Rotate secrets periodically**: Change the secret if compromised
4. **Monitor access logs**: Check for unauthorized access attempts
5. **Use HTTPS**: Always use HTTPS in production to protect the secret in transit

### Environment Variables

Required:
- `CRON_SECRET`: Secret token for authentication (required)

Optional:
- `CRON_ALLOW_LOCALHOST`: Set to `true` to allow localhost requests without authentication (default: false)
- `CRON_ALLOW_NO_SECRET`: Set to `true` in development to allow requests without secret (default: false, development only)

## Recommended Schedule

- **Daily at midnight**: Good for most use cases, checks once per day
- **Every 6 hours**: More frequent checks, useful for time-sensitive operations
- **Every hour**: Very frequent, only if you need near-real-time updates

Choose based on your business needs and server resources.
