// Centralized ClickHouse configuration
export const clickhouseConfig = {
  host: process.env.CLICKHOUSE_HOST || 'http://34.34.71.156:8123',
  username: process.env.CLICKHOUSE_USER || 'default',
  password: process.env.CLICKHOUSE_PASSWORD || 'elarion',
};

// Validate required environment variables
export function validateClickhouseConfig() {
  if (!process.env.CLICKHOUSE_HOST) {
    console.warn('⚠️  CLICKHOUSE_HOST not set, using default');
  }
  if (!process.env.CLICKHOUSE_USER) {
    console.warn('⚠️  CLICKHOUSE_USER not set, using default');
  }
  if (!process.env.CLICKHOUSE_PASSWORD) {
    console.warn('⚠️  CLICKHOUSE_PASSWORD not set, using default');
  }
}

// Helper function to get ClickHouse connection config
export function getClickhouseConnection() {
  return {
    host: clickhouseConfig.host,
    username: clickhouseConfig.username,
    password: clickhouseConfig.password,
  };
} 