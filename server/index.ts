import 'dotenv/config';
import express from 'express';
import routes from './routes/index.js';
import { setupVite, serveStatic } from "./vite";
import { createServer } from "http";
import companyProfilesRouter from './routes/companyProfiles';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import customersRouter from './routes/customers';
import invoicesRouter from './routes/invoices';
import authRouter from './routes/auth';
import { registerRoutes } from './routes';
import { requestLogger, logger, WORKFLOW } from './utils/logger';

const app = express();

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true // Allow cookies
}));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Add request logger middleware
app.use(requestLogger);

const startPort = 3000;
logger.info({ workflow: WORKFLOW.SERVER }, `Starting backend in ${app.get('env')} mode on port ${startPort}`);

logger.debug({ workflow: WORKFLOW.SERVER }, 'Registering routes');
app.use('/api', routes);
app.use('/api/auth', authRouter);
app.use('/api/company-profiles', companyProfilesRouter);
app.use('/api/customers', customersRouter);
app.use('/api/invoices', invoicesRouter);

const server = createServer(app);

const tryPort = (port: number): Promise<number> => {
  return new Promise((resolve, reject) => {
    server.once('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        logger.warn({ 
          workflow: WORKFLOW.SERVER,
          port,
          error: err 
        }, `Port ${port} is in use, trying ${port + 1}`);
        resolve(tryPort(port + 1));
      } else {
        reject(err);
      }
    });

    server.listen(port, () => {
      logger.info({ 
        workflow: WORKFLOW.SERVER,
        port 
      }, `Backend started successfully on http://localhost:${port}`);
      resolve(port);
    });
  });
};

(async () => {
  // Error handler
  app.use((err: any, _req: any, res: any, _next: any) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    logger.error({ 
      workflow: WORKFLOW.ERROR,
      error: err,
      status,
      message,
      requestId: _req.requestId 
    }, 'Unhandled error occurred');

    res.status(status).json({ message });
  });

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  try {
    await tryPort(startPort);
  } catch (err) {
    logger.error({ 
      workflow: WORKFLOW.SERVER,
      error: err 
    }, 'Failed to start server');
    process.exit(1);
  }
})();
