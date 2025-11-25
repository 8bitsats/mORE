import { NextResponse } from 'next/server';
import { ensureBotInitialized } from '@/lib/init-bot';
import { getQuery } from '@bot/utils/database';
import { decrypt, isEncrypted } from '@bot/utils/encryption';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    await ensureBotInitialized();

    const { password } = await request.json();

    if (!password) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      );
    }

    // Get stored password from database
    const storedPasswordRow = await getQuery<{ value: string }>(
      'SELECT value FROM settings WHERE key = ?',
      ['DASHBOARD_PASSWORD']
    );

    if (!storedPasswordRow || !storedPasswordRow.value) {
      // No password set - allow access (backward compatibility)
      const cookieStore = await cookies();
      cookieStore.set('dashboard_auth', 'authenticated', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });

      return NextResponse.json({ success: true, noPasswordSet: true });
    }

    // Decrypt stored password
    let storedPassword = storedPasswordRow.value;
    if (isEncrypted(storedPassword)) {
      try {
        storedPassword = decrypt(storedPassword);
      } catch (error) {
        console.error('Failed to decrypt password:', error);
        return NextResponse.json(
          { error: 'Authentication system error' },
          { status: 500 }
        );
      }
    }

    // Compare passwords
    if (password !== storedPassword) {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      );
    }

    // Set authentication cookie
    const cookieStore = await cookies();
    cookieStore.set('dashboard_auth', 'authenticated', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}
