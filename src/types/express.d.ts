// src/types/express.d.ts
import { Request } from "express";

declare module "express-serve-static-core" {
  export interface Request {
    id: string;
    abortSignal: AbortSignal;
    validatedBody?: any;
    validatedQuery?: any;
    validatedParams?: any;
  }
}

// In express.d.ts
declare global {
  namespace Express {
    interface Request {
      id: string;
      timedout?: boolean;
    }
  }
}
