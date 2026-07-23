import { PrismaClient } from '@prisma/client';

// Single shared client — creating one per request would exhaust DB connections.
export const prisma = new PrismaClient();
