import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/';

  if (code) {
    const supabase = createRouteHandlerClient({ cookies });
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}

export async function POST(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const formData = await request.formData();
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const provider = formData.get('provider') as 'google' | 'github' | undefined;
  const next = formData.get('next') as string || '/';
  
  const supabase = createRouteHandlerClient({ cookies });
  
  // Handle OAuth sign in
  if (provider) {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${requestUrl.origin}/api/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });

    if (error || !data.url) {
      console.error('OAuth error:', error);
      return NextResponse.redirect(
        `${requestUrl.origin}/sign-in?error=${encodeURIComponent(error?.message || 'Authentication failed')}`
      );
    }

    return NextResponse.redirect(data.url);
  }
  
  // Handle email/password sign in
  if (!email || !password) {
    return NextResponse.redirect(
      `${requestUrl.origin}/sign-in?error=${encodeURIComponent('Email and password are required')}`
    );
  }
  
  try {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) throw error;
    
    return NextResponse.redirect(new URL(next, requestUrl.origin));
  } catch (error) {
    console.error('Sign in error:', error);
    return NextResponse.redirect(
      `${requestUrl.origin}/sign-in?error=${encodeURIComponent('Invalid login credentials')}`
    );
  }
}
