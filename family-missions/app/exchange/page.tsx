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
                                  supabase.auth.exchangeCodeForSession(code).then((result: any) => {
                                        window.location.href = result.error
                                                ? '/login?error=auth_failed'
                                                        : '/dashboard'
                                                            })
                                                              }, [])

                                                                return (
                                                                    <div style={{
                                                                          minHeight: '100vh',
                                                                                display: 'flex',
                                                                                      alignItems: 'center',
                                                                                            justifyContent: 'center',
                                                                                                  background: '#f7f4ef',
                                                                                                      }}>
                                                                                                            <p style={{ color: '#888', fontSize: 16 }}>Loading...</p>
                                                                                                                </div>
                                                                                                                  )
                                                                                                                  }