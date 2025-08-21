# ClickHouse Configuration Setup

## Overview

This document describes the centralized ClickHouse configuration system implemented to improve security and maintainability.

## Security Improvements

### Before (❌ Insecure)
- Hardcoded credentials scattered across 35+ API routes
- IP addresses and passwords visible in source code
- Difficult to update credentials across multiple files
- Security risk if code is shared or exposed

### After (✅ Secure)
- Centralized configuration in `lib/clickhouse.ts`
- All credentials use environment variables
- Single source of truth for ClickHouse settings
- Easy to update and manage credentials

## Configuration

### Environment Variables

Add these to your `.env` file:

```bash
# ClickHouse Database Configuration
CLICKHOUSE_HOST=http://your-clickhouse-server:8123
CLICKHOUSE_USER=your_username
CLICKHOUSE_PASSWORD=your_password
```

### Fallback Values

If environment variables are not set, the system uses these fallback values:

```typescript
// lib/clickhouse.ts
export const clickhouseConfig = {
  host: process.env.CLICKHOUSE_HOST || 'http://34.34.71.156:8123',
  username: process.env.CLICKHOUSE_USER || 'default',
  password: process.env.CLICKHOUSE_PASSWORD || 'elarion',
};
```

## Usage

### In API Routes

Instead of hardcoded configuration:

```typescript
// ❌ Old way (insecure)
client = createClient({
  host: process.env.CLICKHOUSE_HOST,
  username: process.env.CLICKHOUSE_USER,
  password: process.env.CLICKHOUSE_PASSWORD,
});
```

Use the centralized configuration:

```typescript
// ✅ New way (secure)
import { getClickhouseConnection } from '@/lib/clickhouse';

const clickhouseConfig = getClickhouseConnection();
client = createClient(clickhouseConfig);
```

## Files Updated

The following files were automatically updated to use the centralized configuration:

- `app/api/overview/general/route.ts`
- `app/api/pickup/stats/route.ts`
- `app/api/booking-channels/*/route.ts` (6 files)
- `app/api/market-segments/*/route.ts` (6 files)
- `app/api/room-types/*/route.ts` (6 files)
- `app/api/overview/*/route.ts` (5 files)
- `app/api/pickup/*/route.ts` (3 files)
- `app/api/pickup-analytics/*/route.ts` (1 file)
- `app/api/pace/route.ts` (1 file)

## Validation

The system includes validation to warn about missing environment variables:

```typescript
import { validateClickhouseConfig } from '@/lib/clickhouse';

// Call this during app initialization
validateClickhouseConfig();
```

## Migration Guide

### For Development

1. Copy your existing ClickHouse credentials to `.env`:
   ```bash
   CLICKHOUSE_HOST=http://your-server:8123
   CLICKHOUSE_USER=your_username
   CLICKHOUSE_PASSWORD=your_password
   ```

2. Restart your development server:
   ```bash
   npm run dev
   ```

### For Production

1. Set environment variables in your deployment platform
2. Ensure `.env` file is not committed to version control
3. Use secure credential management (e.g., Vercel Environment Variables)

## Benefits

1. **Security**: No hardcoded credentials in source code
2. **Maintainability**: Single place to update ClickHouse settings
3. **Flexibility**: Easy to switch between different ClickHouse instances
4. **Validation**: Built-in checks for missing environment variables
5. **Consistency**: All API routes use the same configuration

## Troubleshooting

### Missing Environment Variables

If you see warnings about missing environment variables:

1. Check that your `.env` file exists and contains the required variables
2. Restart your development server after adding environment variables
3. Verify the variable names match exactly (case-sensitive)

### Connection Issues

If ClickHouse connection fails:

1. Verify your ClickHouse server is running and accessible
2. Check that the host URL includes the correct port (usually 8123)
3. Ensure your credentials have the necessary permissions
4. Test the connection manually using a ClickHouse client

## Security Best Practices

1. **Never commit credentials to version control**
2. **Use different credentials for development and production**
3. **Rotate passwords regularly**
4. **Use environment variables for all sensitive data**
5. **Validate configuration on application startup** 