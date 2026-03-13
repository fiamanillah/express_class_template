import { User } from "@/generated/prisma/client";

declare global {
  namespace Express {
    interface Request {
      id: string;
      userId?: string;
      user?: User;
      validatedBody?: any;
      validatedParams?: any;
      rawBody?: Buffer;
    }
  }
}
export {};
