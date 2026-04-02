'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase'

export default function AuthExchangePage() {
      useEffect(() => {
            const code = new URLSearchParams(window.location.search).get('code')
                if (!code) {
                          window.location.href = '/login?error=auth_failed'
                                return
                }
                    const supabase = createClient()
                        supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
                                  window.location.href = error ? '/login?error=auth_failed' : '/dashboard'
                                      })
                                        }, [])

                                          return (
                                              <div style={{
                                                    minHeight: '100vh',
                                                          display: 'flex',
                                                                alignItems: 'center',
                                                                      justifyContent: 'center',
                                                                            fontFamily: '-apple-system,system-ui,sans-serif',
                                                                                  background: '#f7f4ef',
                                              }}>
                                                    <p style={{ color: '#888', fontSize: 16 }}>로그인 처리 중...</p>
                                                        </div>
                                                          )
                                                          }
                        })
                }
      })
}