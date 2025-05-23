import 'dotenv/config';
import express from 'express';
import routes from './routes/index.js';
import { setupVite, serveStatic, log } from "./vite";
import { createServer } from "http";
import companyProfilesRouter from './routes/companyProfiles';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import customersRouter from './routes/customers';
import invoicesRouter from './routes/invoices';
import authRouter from './routes/auth';

const app = express();

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true // Allow cookies
}));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

const startPort = 3000;
console.log(`[BOOT] Starting backend in ${app.get('env')} mode on port ${startPort}`);

console.log('[BOOT] Registering route: /api');
app.use('/api', routes);
app.use('/api/auth', authRouter);
app.use('/api/company-profiles', companyProfilesRouter);
app.use('/api/customers', customersRouter);
app.use('/api/invoices', invoicesRouter);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

const server = createServer(app);

const tryPort = (port: number): Promise<number> => {
  return new Promise((resolve, reject) => {
    server.once('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`[BOOT] Port ${port} is in use, trying ${port + 1}`);
        resolve(tryPort(port + 1));
      } else {
        reject(err);
      }
    });

    server.listen(port, () => {
      console.log(`[BOOT] Backend started successfully on http://localhost:${port}`);
      resolve(port);
    });
  });
};

(async () => {
  // Error handler
  app.use((err: any, _req: any, res: any, _next: any) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  try {
    await tryPort(startPort);
  } catch (err) {
    console.error('[FATAL] Failed to start server:', err);
    process.exit(1);
  }
})();
