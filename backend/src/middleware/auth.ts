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
    if (!token) {
      req.user = null;
      return next();
    }

    let payload: any;
    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      req.user = null;
      return next();
    }
    if (!payload || !payload.userId) {
      req.user = null;
      return next();
    }

    const user = await prisma.user.findUnique({ where: { id: payload.userId }, select: { id: true, email: true, firstName: true, lastName: true } });
    if (!user) {
      req.user = null;
      return next();
    }

    req.user = user as any;
    next();
  } catch (err) {
    req.user = null;
    next();
  }
}

export function signToken(userId: string) {
  const JWT_EXPIRES = process.env.JWT_EXPIRES || '7d';
  // cast values to satisfy TypeScript definitions from jsonwebtoken types
  return jwt.sign({ userId }, JWT_SECRET as unknown as jwt.Secret, { expiresIn: JWT_EXPIRES } as jwt.SignOptions);
}
