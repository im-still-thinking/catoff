import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET!;

export function signChallenge(challenge: Challenge ): string {
    const payload = {
        ...challenge,
        exp: Math.floor(new Date(challenge.expiresAt).getTime() / 1000)
      };
      
      return jwt.sign(payload, JWT_SECRET);
}

export function verifyChallenge(token: string): Challenge {
  return jwt.verify(token, JWT_SECRET) as Challenge;
}