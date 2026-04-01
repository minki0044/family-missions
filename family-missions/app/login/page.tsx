'use client'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const searchParams = useSearchParams()

  useEffect(() => {
    if (searchParams.get('error') === 'auth_failed') {
      setError('로그인에 실패했습니다. 등록된 가족 계정으로 다시 시도해주세요.')
    }
  }, [searchParams])

  const handleLogin = async () => {
    setLoading(true)
    setError('')
    const sb = createClient()
    const { error } = await sb.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) { setError(error.message); setLoading(false) }
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#f7f4ef', display: 'flex',
      flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 32, fontFamily: '-apple-system,system-ui,sans-serif',
    }}>
      <div style={{
        width: 68, height: 68, borderRadius: 20,
        background: 'linear-gradient(135deg,#FF8C42,#E8637A)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 34, marginBottom: 18, boxShadow: '0 8px 24px rgba(232,99,122,0.3)',
      }}>🏠</div>
      <h1 style={{ fontSize: 26, fontWeight: 800, color: '#333', letterSpacing: -0.5, marginBottom: 6 }}>
        Family Missions
      </h1>
      <p style={{ fontSize: 14, color: '#bbb', marginBottom: 48 }}>가족 습관 트래커</p>

      <div style={{ width: '100%', maxWidth: 320 }}>
        <button onClick={handleLogin} disabled={loading} style={{
          width: '100%', padding: '16px 20px',
          background: loading ? '#f0ede8' : '#fff',
          border: '1.5px solid #eee', borderRadius: 14,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
          cursor: loading ? 'default' : 'pointer',
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
          fontSize: 15, fontWeight: 600, color: '#333',
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {loading ? '로그인 중...' : 'Google 계정으로 로그인'}
        </button>

        {error && (
          <p style={{ marginTop: 12, fontSize: 13, color: '#E8637A', textAlign: 'center' }}>{error}</p>
        )}

        <p style={{ marginTop: 20, fontSize: 12, color: '#ccc', textAlign: 'center', lineHeight: 1.7 }}>
          등록된 가족 Google 계정으로만 접속 가능합니다.<br />
          접속 문제 시 아빠(readflow7@gmail.com)에게 문의하세요.
        </p>
      </div>
    </div>
  )
}
