-- =============================================
-- Family Missions - Supabase Schema
-- =============================================

-- 1. 유저 프로필 (Auth와 별도)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text unique not null,
  display_name text,
  tab_order text[] default array['dad','mom','iheon','jiheon'],
  family_role text, -- 'dad' | 'mom' | 'iheon' | 'jiheon'
  created_at timestamptz default now()
);

-- 2. 미션
create table public.missions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  emoji text default '🎯',
  description text,
  weekly_target int not null default 3 check (weekly_target between 1 and 7),
  is_primary boolean default false,
  created_at timestamptz default now()
);

-- 3. 체크인
create table public.check_ins (
  id uuid default gen_random_uuid() primary key,
  mission_id uuid references public.missions(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  checked_date date not null,
  created_at timestamptz default now(),
  unique(mission_id, checked_date)
);

-- =============================================
-- RLS (Row Level Security)
-- =============================================

alter table public.profiles enable row level security;
alter table public.missions enable row level security;
alter table public.check_ins enable row level security;

-- profiles: 로그인한 사람은 모두 읽기 가능, 본인만 쓰기
create policy "profiles_select" on public.profiles for select using (auth.role() = 'authenticated');
create policy "profiles_insert" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update" on public.profiles for update using (auth.uid() = id);

-- missions: 로그인한 사람은 모두 읽기, 본인만 쓰기
create policy "missions_select" on public.missions for select using (auth.role() = 'authenticated');
create policy "missions_insert" on public.missions for insert with check (auth.uid() = user_id);
create policy "missions_update" on public.missions for update using (auth.uid() = user_id);
create policy "missions_delete" on public.missions for delete using (auth.uid() = user_id);

-- check_ins: 로그인한 사람 모두 읽기, 본인 미션만 쓰기
create policy "checkins_select" on public.check_ins for select using (auth.role() = 'authenticated');
create policy "checkins_insert" on public.check_ins for insert with check (auth.uid() = user_id);
create policy "checkins_delete" on public.check_ins for delete using (auth.uid() = user_id);

-- =============================================
-- 신규 유저 자동 프로필 생성 트리거
-- =============================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
