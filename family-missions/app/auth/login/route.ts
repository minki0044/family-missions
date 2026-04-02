import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { origin } = new URL(request.url)
  const cookiesToSet: { name: string; value: string; options: CookieOptions }[] = []

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cs: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.push(...cs)
        },
      },
    }
  )

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  })

  if (error || !data.url) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
  }

  const response = NextResponse.redirect(data.url)
  cookiesToSet.forEach(({ name, value, options }) =>
    response.cookies.set(name, value, options)
  )
  return response
}