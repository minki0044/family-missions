# Family Missions 배포 가이드

## 1. Supabase 설정

### DB 스키마 적용
1. Supabase 대시보드 → SQL Editor
2. `supabase/schema.sql` 전체 내용 붙여넣고 실행

### 가족 계정 family_role 등록
가족이 Google 로그인하면 profiles 테이블에 자동 생성됨.
이후 SQL Editor에서 각자 role을 지정:

```sql
-- 각 가족 Gmail로 role 지정
UPDATE profiles SET family_role = 'dad'    WHERE email = 'readflow7@gmail.com';
UPDATE profiles SET family_role = 'mom'    WHERE email = 'mom@gmail.com';
UPDATE profiles SET family_role = 'iheon'  WHERE email = 'iheon@gmail.com';
UPDATE profiles SET family_role = 'jiheon' WHERE email = 'jiheon@gmail.com';
```

### Google OAuth 설정
1. Supabase → Authentication → Providers → Google 활성화
2. Google Cloud Console (console.cloud.google.com):
   - 새 프로젝트 생성 → "OAuth 2.0 클라이언트 ID" 생성
   - 승인된 리디렉션 URI: `https://ikamqjfizsdewoxjdpbf.supabase.co/auth/v1/callback`
3. Client ID, Client Secret을 Supabase Google Provider에 입력

## 2. Vercel 배포

```bash
# 1. GitHub에 올리기
git init
git add .
git commit -m "init"
git remote add origin https://github.com/YOUR_GITHUB/family-missions.git
git push -u origin main

# 2. vercel.com → Import Project → GitHub 선택
# 3. Environment Variables 추가:
#    NEXT_PUBLIC_SUPABASE_URL = https://ikamqjfizsdewoxjdpbf.supabase.co
#    NEXT_PUBLIC_SUPABASE_ANON_KEY = sb_publishable_ogItqGUKKQeGsqXfsiSxyg_SwUnU9DY
# 4. Deploy
```

## 3. 커스텀 도메인 연결
Vercel → 프로젝트 → Settings → Domains → 도메인 입력
DNS 설정은 도메인 제공업체에서 CNAME 추가.

## 4. Supabase에 배포 URL 등록
Supabase → Authentication → URL Configuration:
- Site URL: `https://your-domain.com`
- Redirect URLs: `https://your-domain.com/auth/callback`
