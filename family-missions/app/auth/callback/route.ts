import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')

      console.log('[callback] code present:', !!code)
        const allCookies = request.cookies.getAll()
          console.log('[callback] cookie names:', allCookies.map(c => c.name).join(', '))
            const verifierCookie = allCookies.find(c => c.name.includes('code-verifier'))
              console.log('[callback] verifier cookie found:', !!verifierCookie, verifierCookie?.name)

                if (code) {
                    const supabaseResponse = NextResponse.redirect(`${origin}/dashboard`)

                        const supabase = createServerClient(
                              process.env.NEXT_PUBLIC_SUPABASE_URL!,
                                    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
                                          {
                                                  cookies: {
                                                            getAll() { return request.cookies.getAll() },
                                                                      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
                                                                                  cookiesToSet.forEach(({ name, value, options }) =>
                                                                                                supabaseResponse.cookies.set(name, value, options)
                                                                                                            )
                                                                                                                      },
                                                                                                                              },
                                                                                                                                    }
                                                                                                                                        )

                                                                                                                                            const { error } = await supabase.auth.exchangeCodeForSession(code)
                                                                                                                                                console.log('[callback] exchange error:', error ? JSON.stringify(error) : 'none')
                                                                                                                                                    if (!error) {
                                                                                                                                                          return supabaseResponse
                                                                                                                                                              }
                                                                                                                                                                }

                                                                                                                                                                  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
                                                                                                                                                                  }