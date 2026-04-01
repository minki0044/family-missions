import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Family Missions',
  description: '가족 습관 트래커',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
