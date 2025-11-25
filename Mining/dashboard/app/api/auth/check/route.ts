import { NextResponse } from 'next/server';
import { ensureBotInitialized } from '@/lib/init-bot';
import { getQuery } from '@bot/utils/database';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    await ensureBotInitialized();

    // Check if password is set
    const passwordRow = await getQuery<{ value: string }>(
      'SELECT value FROM settings WHERE key = ?',
      ['DASHBOARD_PASSWORD']
    );

    const passwordRequired = Boolean(passwordRow && passwordRow.value);

    if (!passwordRequired) {
      // No password set - automatically authenticate the user
      const cookieStore = await cookies();
      cookieStore.set('dashboard_auth', 'authenticated', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });

      return NextResponse.json({
        authenticated: true,
        passwordRequired: false,
      });
    }

    // Check authentication cookie
    const cookieStore = await cookies();
    const authCookie = cookieStore.get('dashboard_auth');
    const authenticated = authCookie?.value === 'authenticated';

    return NextResponse.json({
      authenticated,
      passwordRequired: true,
    });
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json(
      { error: 'Authentication check failed' },
      { status: 500 }
    );
  }
}
