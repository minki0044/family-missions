import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
    const { searchParams, origin } = new URL(request.url)
      const code = searchParams.get('code')

        if (code) {
            // createBrowserClient가 PKCE code verifier를 document.cookie에 저장함.
                // server-side Route Handler에서는 해당 쿠키를 읽을 수 없으므로
                    // client-side에서 exchange하는 /exchange 페이지로 리다이렉트.
                        return NextResponse.redirect(`${origin}/exchange?code=${encodeURIComponent(code)}`)
                          }

                            return NextResponse.redirect(`${origin}/login?error=auth_failed`)
                            }
