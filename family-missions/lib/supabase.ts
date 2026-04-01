import { createBrowserClient } from '@supabase/ssr'

export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

export type Profile = {
  id: string
  email: string
  display_name: string
  tab_order: string[]
  family_role: string | null
  created_at: string
}

export type Mission = {
  id: string
  user_id: string
  name: string
  emoji: string
  description: string | null
  weekly_target: number
  is_primary: boolean
  created_at: string
}

export type CheckIn = {
  id: string
  mission_id: string
  user_id: string
  checked_date: string
  created_at: string
}
