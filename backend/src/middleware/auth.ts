import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

export interface AuthRequest extends Request {
  user?: any;
}

export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.token || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const payload: any = jwt.verify(token, JWT_SECRET);
    if (!payload || !payload.userId) return res.status(401).json({ error: 'Unauthorized' });

    const user = await prisma.user.findUnique({ where: { id: payload.userId }, select: { id: true, email: true, firstName: true, lastName: true, dwollaCustomerId: true, dwollaCustomerUrl: true } });
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    req.user = user as any;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

export function signToken(userId: string) {
  const JWT_EXPIRES = process.env.JWT_EXPIRES || '7d';
  // cast values to satisfy TypeScript definitions from jsonwebtoken types
  return jwt.sign({ userId }, JWT_SECRET as unknown as jwt.Secret, { expiresIn: JWT_EXPIRES } as jwt.SignOptions);
}
