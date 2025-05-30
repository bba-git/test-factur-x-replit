import pino from 'pino';

// Helper to safely stringify and truncate large objects
export function safeLog(obj: any, maxLength: number = 1000): string {
  try {
    const str = JSON.stringify(obj, null, 2);
    return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
  } catch (error) {
    return '[Object cannot be stringified]';
  }
}

// Create the logger instance
export const logger = pino({
  browser: {
    write: {
      info: (...args) => console.log(...args),
      error: (...args) => console.error(...args),
      debug: (...args) => console.debug(...args),
      warn: (...args) => console.warn(...args),
    },
  },
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
}); 