'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function AuthExchangePage() {
      const [status, setStatus] = useState('Exchanging...')
        const [errMsg, setErrMsg] = useState('')

          useEffect(() => {
              const code = new URLSearchParams(window.location.search).get('code')
                  console.log('[exchange] code present:', !!code)
                      console.log('[exchange] cookies:', document.cookie)
                          if (!code) {
                                setStatus('No code found')
                                      setErrMsg('No authorization code in URL')
                                            return
                                                }
                                                    const supabase = createClient()
                                                        supabase.auth.exchangeCodeForSession(code).then((result: any) => {
                                                              console.log('[exchange] error:', JSON.stringify(result.error))
                                                                    if (result.error) {
                                                                            setStatus('Exchange failed')
                                                                                    setErrMsg(result.error.message || JSON.stringify(result.error))
                                                                                          } else {
                                                                                                  window.location.href = '/dashboard'
                                                                                                        }
                                                                                                            })
                                                                                                              }, [])

                                                                                                                return (
                                                                                                                    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f7f4ef', gap: 16 }}>
                                                                                                                              <p style={{ color: '#555', fontSize: 16 }}>{status}</p>
                                                                                                                                    {errMsg && <pre style={{ background: '#fee', color: '#c00', padding: 16, borderRadius: 8, maxWidth: 600, wordBreak: 'break-all', whiteSpace: 'pre-wrap', fontSize: 13 }}>{errMsg}</pre>}
                                                                                                                                          {errMsg && <a href="/login" style={{ color: '#888', fontSize: 14 }}>Back to login</a>}
                                                                                                                                              </div>
                                                                                                                                                )
                                                                                                                                                }