import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      context?: {
        companyProfileId: string;
        userId: string;
      };
    }
  }
} 