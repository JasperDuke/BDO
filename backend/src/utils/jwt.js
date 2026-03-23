import jwt from 'jsonwebtoken';

export function signUserToken(userId) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not set');
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign({ sub: userId }, secret, { expiresIn });
}
