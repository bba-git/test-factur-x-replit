import pino from 'pino';
import { v4 as uuidv4 } from 'uuid';

// Define workflow types
export const WORKFLOW = {
  PDF: 'pdf',
  INVOICE: 'invoice',
  REQUEST: 'request',
  AUTH: 'auth',
  CUSTOMER: 'customer',
  COMPANY: 'company',
  SERVER: 'server',
  ERROR: 'error'
} as const;

// Helper to safely stringify and truncate large objects
export function safeLog(obj: any, maxLength: number = 1000): string {
  try {
    const str = JSON.stringify(obj, null, 2);
    return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
  } catch (error) {
    return '[Object cannot be stringified]';
  }
}

// Create a base logger configuration
const baseConfig = {
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  formatters: {
    level: (label: string) => {
      return { level: label };
    },
    error: (error: Error) => {
      return {
        type: error.name,
        message: error.message,
        stack: error.stack,
        code: (error as any).code,
      };
    },
  },
  mixin: () => {
    return {
      requestId: uuidv4(),
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
    };
  },
};

// Create different transports based on environment
const transport = process.env.NODE_ENV === 'production'
  ? {
      target: 'pino/file',
      options: {
        destination: './logs/app.log',
        mkdir: true,
      },
    }
  : {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
        messageFormat: '{workflow} - {msg}',
      },
    };

// Create the logger instance
export const logger = pino({
  ...baseConfig,
  transport,
});

// Create a child logger for HTTP requests
export const httpLogger = pino({
  ...baseConfig,
  transport,
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
      headers: req.headers,
      query: req.query,
      params: req.params,
    }),
    res: (res) => ({
      statusCode: res.statusCode,
      headers: res.getHeaders(),
    }),
  },
});

// Export a request logger middleware
export const requestLogger = (req: any, res: any, next: any) => {
  const requestId = uuidv4();
  req.requestId = requestId;
  res.requestId = requestId;

  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    httpLogger.info({
      workflow: WORKFLOW.REQUEST,
      requestId,
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
    });
  });
  next();
}; 