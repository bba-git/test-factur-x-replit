import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      context?: {
        user: {
          id: string;
          email: string;
          company_profile_id: string;
        };
        companyProfileId: string;
      };
    }
  }
} 