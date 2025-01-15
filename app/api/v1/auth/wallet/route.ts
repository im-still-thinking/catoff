import { NextResponse } from 'next/server';
import { PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import nacl from 'tweetnacl';
import jwt from 'jsonwebtoken';
import { secrets } from '@/lib/config';

const JWT_SECRET = secrets.JWT_SECRET!;
const JWT_EXPIRY = '24h';

export async function POST(request: Request) {
  try {
    const body: WalletAuthPayload = await request.json();
    const { publicKey, signature, message, timestamp } = body;

    // Verify the timestamp is recent (within 5 minutes)
    const now = Date.now();
    if (now - timestamp > 5 * 60 * 1000) {
      return NextResponse.json(
        { error: 'Message timestamp too old' },
        { status: 400 }
      );
    }

    const messageBytes = new TextEncoder().encode(message);
    
    const signatureBytes = bs58.decode(signature);
    
    const publicKeyObj = new PublicKey(publicKey);
    const publicKeyBytes = publicKeyObj.toBytes();

    const isValid = nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      publicKeyBytes
    );

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    const token = jwt.sign(
      {
        publicKey,
        type: 'wallet',
      },
      JWT_SECRET,
      {
        expiresIn: JWT_EXPIRY,
      }
    );

    return NextResponse.json({
      token,
      expiresIn: 24 * 60 * 60,
    });
  } catch (error) {
    console.error('Wallet authentication error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}