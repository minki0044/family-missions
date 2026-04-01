'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, Mission, CheckIn, Profile } from '@/lib/supabase'

// ── 날짜 유틸 ──
const fmt = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const parse = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d) }
const addDay = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate() + n); return r }
const monOf = (d: Date) => { const r = new Date(d); const dw = r.getDay(); r.setDate(r.getDate() - (dw === 0 ? 6 : dw - 1)); return r }
const wkKey = (d: string) => fmt(monOf(parse(d)))
const TODAY = fmt(new Date())
const MKR = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월']
const DKR = ['일','월','화','수','목','금','토']

// ── 가족 설정 (어드민이 관리) ──
const FAMILY_CONFIG: Record<string, { name: string; em: string; col: string; bg: string }> = {
  dad:    { name: '아빠', em: '👨', col: '#FF8C42', bg: '#FFF4EC' },
  mom:    { name: '엄마', em: '👩', col: '#E8637A', bg: '#FFF0F2' },
  iheon:  { name: '이헌', em: '🧒', col: '#5B8CFF', bg: '#EFF3FF' },
  jiheon: { name: '지헌', em: '👦', col: '#2BB5A0', bg: '#EBF9F7' },
}
const DEFAULT_ORDER = ['dad', 'mom', 'iheon', 'jiheon']

// ── 통계 계산 ──
function calcStats(m: Mission, ciSet: Set<string>) {
  const start = parse(m.created_at.substring(0, 10)), now = new Date()
  const totalDays = Math.max(1, Math.round((now.getTime() - start.getTime()) / 86400000) + 1)
  const wks: Record<string, number> = {}
  ciSet.forEach(ds => { const k = wkKey(ds); wks[k] = (wks[k] || 0) + 1 })
  const goalWks = Object.values(wks).filter(v => v >= m.weekly_target).length
  const avgPerWeek = parseFloat((ciSet.size / (totalDays / 7)).toFixed(1))
  const nowW = fmt(monOf(now))
  const allWks: string[] = []
  for (let d = new Date(monOf(start));; d = addDay(d, 7)) {
    allWks.push(fmt(d)); if (fmt(d) >= nowW || allWks.length > 200) break
  }
  let curS = 0, maxS = 0, run = 0
  allWks.forEach((k, i) => {
    if ((wks[k] || 0) >= m.weekly_target) { run++; maxS = Math.max(maxS, run); if (i === allWks.length - 1) curS = run }
    else { if (i === allWks.length - 1) curS = 0; run = 0 }
  })
  const monthly: Record<string, number> = {}
  ciSet.forEach(ds => { const k = ds.substring(0, 7); monthly[k] = (monthly[k] || 0) + 1 })
  return { total: ciSet.size, goalWks, avgPerWeek, curS, maxS: Math.max(maxS, curS), monthly, totalDays }
}

// ── SUB COMPONENTS ──

function MiniGrid({ mission, ciSet, col, canEdit, onToggle }: {
  mission: Mission; ciSet: Set<string>; col: string; canEdit: boolean; onToggle: (mid: string, ds: string) => void
}) {
  const dates = Array.from({ length: 7 }, (_, i) => fmt(addDay(new Date(), -(6 - i))))
  return (
    <div>
      <div style={{ display: 'flex', gap: 3, marginBottom: 3 }}>
        {dates.map(ds => <div key={ds} style={{ flex: 1, textAlign: 'center', fontSize: 9, color: '#bbb' }}>{DKR[parse(ds).getDay()]}</div>)}
      </div>
      <div style={{ display: 'flex', gap: 3 }}>
        {dates.map(ds => {
          const ch = ciSet.has(ds), isT = ds === TODAY
          return (
            <div key={ds} onClick={canEdit ? () => onToggle(mission.id, ds) : undefined} style={{
              flex: 1, height: 32, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 700,
              background: ch ? col : isT ? '#f0ede8' : '#ede9e2',
              color: ch ? '#fff' : '#ccc',
              border: isT && !ch ? `2px solid ${col}` : '2px solid transparent',
              cursor: canEdit ? 'pointer' : 'default', userSelect: 'none',
            }}>{ch ? '✓' : '—'}</div>
          )
        })}
      </div>
    </div>
  )
}

function Heatmap({ mission, ciSet, col }: { mission: Mission; ciSet: Set<string>; col: string }) {
  const now = new Date()
  const sixAgo = new Date(now); sixAgo.setMonth(sixAgo.getMonth() - 5); sixAgo.setDate(1)
  const start = new Date(monOf(sixAgo))
  const mStart = parse(mission.created_at.substring(0, 10))
  const weeks: Array<Array<{ ds: string; checked: boolean; future: boolean; out: boolean }>> = []
  for (let d = new Date(start); d <= now; d = addDay(d, 7)) {
    weeks.push(Array.from({ length: 7 }, (_, i) => {
      const day = addDay(d, i); const ds = fmt(day)
      return { ds, checked: ciSet.has(ds), future: day > now, out: day < sixAgo || day < mStart }
    }))
  }
  const mcols: Record<string, { col: number }> = {}
  weeks.forEach((_, i) => { const d = parse(weeks[i][0].ds); const k = `${d.getFullYear()}-${d.getMonth()}`; if (!mcols[k]) mcols[k] = { col: i } })
  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ display: 'flex', marginLeft: 20, marginBottom: 3 }}>
        {weeks.map((_, i) => { const d = parse(weeks[i][0].ds); const k = `${d.getFullYear()}-${d.getMonth()}`; return <div key={i} style={{ width: 12, flexShrink: 0, fontSize: 8, color: '#bbb' }}>{mcols[k]?.col === i ? d.getMonth() + 1 : ''}</div> })}
      </div>
      <div style={{ display: 'flex', gap: 1.5 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1.5, marginRight: 3 }}>
          {['M', '', 'W', '', 'F', '', ''].map((l, i) => <div key={i} style={{ height: 10, fontSize: 7, color: '#ccc', lineHeight: '10px', width: 14, textAlign: 'right' }}>{l}</div>)}
        </div>
        {weeks.map((wkDays, wi) => (
          <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {wkDays.map((day, di) => (
              <div key={di} style={{ width: 10, height: 10, borderRadius: 2, flexShrink: 0, background: day.future || day.out ? 'transparent' : day.checked ? col : '#e8e4dd' }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function MonthlyBars({ monthly, col }: { monthly: Record<string, number>; col: string }) {
  const now = new Date()
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    return { key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: MKR[d.getMonth()] }
  })
  const max = Math.max(...months.map(m => monthly[m.key] || 0), 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 90 }}>
      {months.map(m => {
        const val = monthly[m.key] || 0
        return (
          <div key={m.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            <div style={{ fontSize: 10, color: val ? '#777' : 'transparent' }}>{val}</div>
            <div style={{ width: '100%', height: `${Math.max((val / max) * 60, 2)}px`, background: col, borderRadius: '3px 3px 0 0', opacity: 0.85 }} />
            <div style={{ fontSize: 9, color: '#aaa' }}>{m.label.replace('월', '')}</div>
          </div>
        )
      })}
    </div>
  )
}

function MonthCal({ mission, ciSet, year, month, canEdit, onToggle, col }: {
  mission: Mission; ciSet: Set<string>; year: number; month: number
  canEdit: boolean; onToggle: (mid: string, ds: string) => void; col: string
}) {
  const firstDow = new Date(year, month, 1).getDay()
  const pad = firstDow === 0 ? 6 : firstDow - 1
  const dim = new Date(year, month + 1, 0).getDate()
  const cells = [...Array(pad).fill(null), ...Array.from({ length: dim }, (_, i) => i + 1)]
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', marginBottom: 6 }}>
        {['월','화','수','목','금','토','일'].map(d => <div key={d} style={{ textAlign: 'center', fontSize: 11, color: '#ccc', padding: '3px 0' }}>{d}</div>)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={i} />
          const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const ch = ciSet.has(ds), isT = ds === TODAY
          return (
            <div key={i} onClick={() => canEdit && onToggle(mission.id, ds)} style={{
              aspectRatio: '1', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: ch ? 700 : 400,
              background: ch ? col : 'transparent',
              color: ch ? '#fff' : isT ? col : '#999',
              border: isT && !ch ? `2px solid ${col}` : 'none',
              cursor: canEdit ? 'pointer' : 'default', userSelect: 'none',
            }}>{day}</div>
          )
        })}
      </div>
    </div>
  )
}

function Toggle({ on, onChange, col }: { on: boolean; onChange: (v: boolean) => void; col: string }) {
  return (
    <div onClick={() => onChange(!on)} style={{ width: 46, height: 26, borderRadius: 13, background: on ? col : '#ddd', cursor: 'pointer', position: 'relative', flexShrink: 0, transition: 'background .2s' }}>
      <div style={{ position: 'absolute', top: 3, left: on ? 23 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left .2s' }} />
    </div>
  )
}

function AddModal({ onAdd, onClose, col }: { onAdd: (data: Partial<Mission>) => void; onClose: () => void; col: string }) {
  const [name, setName] = useState('')
  const [em, setEm] = useState('🎯')
  const [tgt, setTgt] = useState(3)
  const [desc, setDesc] = useState('')
  const [pri, setPri] = useState(false)
  const EMS = ['🎯','💪','📚','🏃','⚽','✏️','🎸','🍎','💤','🧘','📖','🏋️','🚴','🎨','💻','🌿','🎵','🥗','🌙','🏊']
  return (
    <div onClick={ev => { if (ev.target === ev.currentTarget) onClose() }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100, display: 'flex', alignItems: 'flex-end' }}>
      <div style={{ width: '100%', background: '#fff', borderRadius: '20px 20px 0 0', padding: '24px 20px 36px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: '#333' }}>새 미션 추가</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#bbb', fontSize: 24, cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ fontSize: 11, color: '#aaa', marginBottom: 8 }}>이모지</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 18 }}>
          {EMS.map(emoji => <button key={emoji} onClick={() => setEm(emoji)} style={{ width: 42, height: 42, borderRadius: 10, fontSize: 20, background: em === emoji ? col + '18' : '#f5f5f5', border: `2px solid ${em === emoji ? col : 'transparent'}`, cursor: 'pointer' }}>{emoji}</button>)}
        </div>
        <div style={{ fontSize: 11, color: '#aaa', marginBottom: 6 }}>미션 이름 <span style={{ color: col }}>*</span></div>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="예: 운동, 독서, 명상..." style={{ width: '100%', padding: '12px 14px', background: '#f8f8f8', border: `1.5px solid ${name ? col : '#eee'}`, borderRadius: 10, color: '#333', fontSize: 15, marginBottom: 16, display: 'block' }} />
        <div style={{ fontSize: 11, color: '#aaa', marginBottom: 6 }}>주간 목표 횟수</div>
        <div style={{ display: 'flex', gap: 5, marginBottom: 6 }}>
          {[1,2,3,4,5,6,7].map(n => <button key={n} onClick={() => setTgt(n)} style={{ flex: 1, padding: '10px 0', borderRadius: 8, fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer', background: tgt === n ? col : '#f0f0f0', color: tgt === n ? '#fff' : '#aaa' }}>{n}</button>)}
        </div>
        <div style={{ fontSize: 11, color: '#bbb', marginBottom: 16 }}>주 {tgt}회 이상 완료 → 해당 주 달성 ✓</div>
        <div style={{ fontSize: 11, color: '#aaa', marginBottom: 6 }}>부가 설명 (선택)</div>
        <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="예: 아침 기상 후 30분 운동" style={{ width: '100%', padding: '12px 14px', background: '#f8f8f8', border: '1.5px solid #eee', borderRadius: 10, color: '#333', fontSize: 14, marginBottom: 16, display: 'block' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 14px', background: '#fafafa', borderRadius: 10, marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 14, color: '#555', fontWeight: 500 }}>대표 미션</div>
            <div style={{ fontSize: 11, color: '#bbb', marginTop: 2 }}>카드 상단에 표시됩니다</div>
          </div>
          <Toggle on={pri} onChange={setPri} col={col} />
        </div>
        <button onClick={() => name.trim() && onAdd({ name: name.trim(), emoji: em, weekly_target: tgt, description: desc, is_primary: pri })} style={{ width: '100%', padding: '14px', background: name.trim() ? col : '#eee', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 700, color: name.trim() ? '#fff' : '#bbb', cursor: name.trim() ? 'pointer' : 'default' }}>미션 추가</button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════
// DASHBOARD PAGE
// ═══════════════════════════════════════
export default function DashboardPage() {
  const router = useRouter()
  const [myId, setMyId] = useState<string | null>(null)
  const [myRole, setMyRole] = useState<string | null>(null)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [missions, setMissions] = useState<Mission[]>([])
  const [checkIns, setCheckIns] = useState<CheckIn[]>([])
  const [tabOrder, setTabOrder] = useState<string[]>(DEFAULT_ORDER)
  const [screen, setScreen] = useState<'home' | 'detail' | 'stats'>('home')
  const [detMid, setDetMid] = useState<string | null>(null)
  const [stMid, setStMid] = useState<string | null>(null)
  const [calYear, setCalYear] = useState(new Date().getFullYear())
  const [calMonth, setCalMonth] = useState(new Date().getMonth())
  const [showAdd, setShowAdd] = useState(false)
  const [addFor, setAddFor] = useState<string | null>(null)
  const [showTS, setShowTS] = useState(false)
  const [loading, setLoading] = useState(true)

  const sb = createClient()

  // ── 초기 로드 ──
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await sb.auth.getSession()
      if (!session) { router.replace('/login'); return }
      setMyId(session.user.id)
      // 프로필
      const { data: profs } = await sb.from('profiles').select('*')
      if (profs) { setProfiles(profs); const me = profs.find(p => p.id === session.user.id); if (me) { setMyRole(me.family_role); setTabOrder(me.tab_order || DEFAULT_ORDER) } }
      // 미션
      const { data: ms } = await sb.from('missions').select('*')
      if (ms) setMissions(ms)
      // 체크인 (최근 6개월)
      const sixAgo = new Date(); sixAgo.setMonth(sixAgo.getMonth() - 6)
      const { data: ci } = await sb.from('check_ins').select('*').gte('checked_date', fmt(sixAgo))
      if (ci) setCheckIns(ci)
      setLoading(false)
    }
    init()
  }, [])

  // ── 체크인 Set 만들기 ──
  const ciByMission = useCallback((mid: string): Set<string> => {
    return new Set(checkIns.filter(c => c.mission_id === mid).map(c => c.checked_date))
  }, [checkIns])

  // ── 체크 토글 ──
  const toggle = async (mid: string, ds: string) => {
    const m = missions.find(x => x.id === mid)
    if (!m || m.user_id !== myId) return
    const ciSet = ciByMission(mid)
    if (ciSet.has(ds)) {
      setCheckIns(prev => prev.filter(c => !(c.mission_id === mid && c.checked_date === ds)))
      await sb.from('check_ins').delete().eq('mission_id', mid).eq('checked_date', ds)
    } else {
      const newCi: CheckIn = { id: `temp-${Date.now()}`, mission_id: mid, user_id: myId!, checked_date: ds, created_at: new Date().toISOString() }
      setCheckIns(prev => [...prev, newCi])
      const { data } = await sb.from('check_ins').insert({ mission_id: mid, user_id: myId, checked_date: ds }).select().single()
      if (data) setCheckIns(prev => prev.map(c => c.id === newCi.id ? data : c))
    }
  }

  // ── 미션 추가 ──
  const addMission = async (data: Partial<Mission>) => {
    const uid = addFor || myId
    if (!uid) return
    if (data.is_primary) await sb.from('missions').update({ is_primary: false }).eq('user_id', uid)
    const { data: m } = await sb.from('missions').insert({ ...data, user_id: uid }).select().single()
    if (m) { setMissions(prev => data.is_primary ? prev.map(x => x.user_id === uid ? { ...x, is_primary: false } : x).concat(m) : [...prev, m]) }
    setShowAdd(false); setAddFor(null)
  }

  // ── 대표 미션 설정 ──
  const setPrimary = async (mid: string) => {
    const m = missions.find(x => x.id === mid)
    if (!m || m.user_id !== myId) return
    setMissions(prev => prev.map(x => x.user_id === myId ? { ...x, is_primary: x.id === mid } : x))
    await sb.from('missions').update({ is_primary: false }).eq('user_id', myId)
    await sb.from('missions').update({ is_primary: true }).eq('id', mid)
  }

  // ── 탭 순서 저장 ──
  const saveTabOrder = async (order: string[]) => {
    setTabOrder(order)
    await sb.from('profiles').update({ tab_order: order }).eq('id', myId)
  }

  const logout = async () => { await sb.auth.signOut(); router.replace('/login') }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontSize: 32 }}>🏠</div>
  )

  const detM = missions.find(m => m.id === detMid)
  const stM = missions.find(m => m.id === stMid)

  // 탭 순서대로 profile + config 합치기
  const sortedFam = (() => {
    const roleOrder = tabOrder
    const myProfile = profiles.find(p => p.id === myId)
    const myRole_ = myProfile?.family_role
    const result = roleOrder
      .map(role => {
        const cfg = FAMILY_CONFIG[role]
        const profile = profiles.find(p => p.family_role === role)
        return cfg ? { role, ...cfg, profile } : null
      })
      .filter(Boolean) as Array<{ role: string; name: string; em: string; col: string; bg: string; profile?: Profile }>
    // 내 탭을 맨 앞으로
    if (myRole_) {
      const i = result.findIndex(f => f.role === myRole_)
      if (i > 0) result.unshift(result.splice(i, 1)[0])
    }
    return result
  })()

  const getMissions = (role: string) =>
    missions.filter(m => {
      const p = profiles.find(x => x.family_role === role)
      return p && m.user_id === p.id
    }).sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0))

  const isOwn = (role: string) => {
    const p = profiles.find(x => x.family_role === role)
    return p?.id === myId
  }

  const myConfig = FAMILY_CONFIG[myRole || 'dad'] || FAMILY_CONFIG['dad']

  /* ── STATS ── */
  if (screen === 'stats' && stM) {
    const stProfile = profiles.find(p => p.id === stM.user_id)
    const stRole = stProfile?.family_role || 'dad'
    const stCfg = FAMILY_CONFIG[stRole] || myConfig
    const st = calcStats(stM, ciByMission(stM.id))
    return (
      <div style={{ background: '#f7f4ef', minHeight: '100vh', maxWidth: 480, margin: '0 auto' }}>
        <div style={{ background: '#fff', borderBottom: '1px solid #f0ede8', padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 10, position: 'sticky', top: 0, zIndex: 10 }}>
          <button onClick={() => setScreen('detail')} style={{ background: 'none', border: 'none', color: stCfg.col, fontSize: 22, cursor: 'pointer' }}>←</button>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: '#bbb' }}>{stCfg.name}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#333' }}>{stM.emoji} {stM.name}</div>
          </div>
          <div style={{ padding: '4px 10px', background: stCfg.bg, borderRadius: 8, fontSize: 12, color: stCfg.col, fontWeight: 600 }}>주 {stM.weekly_target}회 목표</div>
        </div>
        <div style={{ padding: '16px 18px 60px' }}>
          {stM.description && <div style={{ fontSize: 12, color: '#bbb', marginBottom: 16 }}>{stM.description}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            {[
              { l: '목표 달성 주', v: st.goalWks, u: '주', hi: true },
              { l: '주간 평균', v: st.avgPerWeek, u: '회', hi: true },
              { l: '총 체크일', v: st.total, u: '일' },
              { l: '현재 스트릭', v: st.curS, u: '주' },
              { l: '최장 스트릭', v: st.maxS, u: '주' },
              { l: '경과일', v: st.totalDays, u: '일' },
            ].map(item => (
              <div key={item.l} style={{ background: '#fff', borderRadius: 14, padding: '16px', border: '1.5px solid #f0ede8' }}>
                <div style={{ fontSize: 10, color: '#bbb', marginBottom: 6 }}>{item.l}</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: item.hi ? stCfg.col : '#333', lineHeight: 1 }}>
                  {item.v}<span style={{ fontSize: 11, fontWeight: 400, color: '#bbb', marginLeft: 3 }}>{item.u}</span>
                </div>
              </div>
            ))}
          </div>
          <div style={{ background: '#fff', borderRadius: 14, padding: '14px 16px', marginBottom: 10, border: '1.5px solid #f0ede8' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#bbb', marginBottom: 12 }}>6개월 기록</div>
            <Heatmap mission={stM} ciSet={ciByMission(stM.id)} col={stCfg.col} />
          </div>
          <div style={{ background: '#fff', borderRadius: 14, padding: '14px 16px', border: '1.5px solid #f0ede8' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#bbb', marginBottom: 12 }}>월별 체크 횟수</div>
            <MonthlyBars monthly={st.monthly} col={stCfg.col} />
          </div>
        </div>
      </div>
    )
  }

  /* ── DETAIL ── */
  if (screen === 'detail' && detM) {
    const detProfile = profiles.find(p => p.id === detM.user_id)
    const detRole = detProfile?.family_role || 'dad'
    const detCfg = FAMILY_CONFIG[detRole] || myConfig
    const detMs = getMissions(detRole)
    const isOwnDetail = detM.user_id === myId
    const nowDate = new Date()
    const isNowMonth = calYear === nowDate.getFullYear() && calMonth === nowDate.getMonth()
    const todayCh = ciByMission(detMid!).has(TODAY)
    return (
      <div style={{ background: '#f7f4ef', minHeight: '100vh', maxWidth: 480, margin: '0 auto' }}>
        <div style={{ background: '#fff', borderBottom: '1px solid #f0ede8', position: 'sticky', top: 0, zIndex: 10 }}>
          <div style={{ padding: '12px 18px 8px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => setScreen('home')} style={{ background: 'none', border: 'none', color: detCfg.col, fontSize: 22, cursor: 'pointer' }}>←</button>
            <span style={{ fontSize: 20 }}>{detCfg.em}</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#333' }}>{detCfg.name}</span>
            {!isOwnDetail && <span style={{ fontSize: 10, color: '#bbb', marginLeft: 4 }}>읽기 전용</span>}
          </div>
          {detMs.length > 1 && (
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '0 18px 10px' }}>
              {detMs.map(m => <button key={m.id} onClick={() => setDetMid(m.id)} style={{ padding: '6px 14px', borderRadius: 20, border: 'none', whiteSpace: 'nowrap', cursor: 'pointer', fontSize: 12, fontWeight: 600, flexShrink: 0, background: detMid === m.id ? detCfg.col : detCfg.bg, color: detMid === m.id ? '#fff' : detCfg.col }}>{m.emoji} {m.name}</button>)}
            </div>
          )}
        </div>
        <div style={{ padding: '14px 18px 60px' }}>
          <div onClick={() => { setStMid(detMid); setScreen('stats') }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: '#fff', borderRadius: 14, marginBottom: 12, cursor: 'pointer', border: '1.5px solid #f0ede8' }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#333' }}>{detM.emoji} {detM.name}</div>
              <div style={{ fontSize: 11, color: '#bbb', marginTop: 2 }}>{detM.description || `주 ${detM.weekly_target}회 목표`}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 12, color: detCfg.col, fontWeight: 600 }}>통계 보기</span>
              <span style={{ color: detCfg.col, fontSize: 18 }}>›</span>
            </div>
          </div>
          {isOwnDetail && (
            <button onClick={() => toggle(detMid!, TODAY)} style={{ width: '100%', padding: '13px', marginBottom: 14, cursor: 'pointer', background: todayCh ? detCfg.col : '#fff', border: `2px solid ${todayCh ? detCfg.col : '#eee'}`, borderRadius: 12, fontSize: 15, fontWeight: 700, color: todayCh ? '#fff' : '#ccc', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>{todayCh ? '✓' : '○'}</span>
              {todayCh ? '오늘 완료!' : '오늘 체크하기'}
            </button>
          )}
          <div style={{ background: '#fff', borderRadius: 14, padding: '14px 16px', marginBottom: 12, border: '1.5px solid #f0ede8' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <button onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1) } else setCalMonth(m => m - 1) }} style={{ background: 'none', border: 'none', color: '#ccc', fontSize: 26, cursor: 'pointer', padding: '0 8px' }}>‹</button>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#555' }}>{calYear}년 {MKR[calMonth]}</span>
              <button onClick={() => { if (!isNowMonth) { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1) } else setCalMonth(m => m + 1) } }} style={{ background: 'none', border: 'none', fontSize: 26, padding: '0 8px', color: isNowMonth ? '#eee' : '#ccc', cursor: isNowMonth ? 'default' : 'pointer' }}>›</button>
            </div>
            <MonthCal mission={detM} ciSet={ciByMission(detMid!)} year={calYear} month={calMonth} canEdit={isOwnDetail} onToggle={toggle} col={detCfg.col} />
          </div>
          <div style={{ background: '#fff', borderRadius: 14, padding: '14px 16px', border: '1.5px solid #f0ede8' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#bbb', marginBottom: 12 }}>6개월 기록</div>
            <Heatmap mission={detM} ciSet={ciByMission(detMid!)} col={detCfg.col} />
          </div>
        </div>
      </div>
    )
  }

  /* ── HOME ── */
  return (
    <div style={{ background: '#f7f4ef', minHeight: '100vh', maxWidth: 480, margin: '0 auto' }}>
      {/* 헤더 */}
      <div style={{ background: '#fff', borderBottom: '1px solid #f0ede8', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,#FF8C42,#E8637A)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🏠</div>
          <span style={{ fontSize: 14, fontWeight: 800, color: '#333', letterSpacing: -0.3 }}>Family Missions</span>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <div style={{ fontSize: 11, color: '#bbb', padding: '4px 8px', background: '#f7f4ef', borderRadius: 8 }}>
            {myConfig.em} {myConfig.name}
          </div>
          <button onClick={() => setShowTS(true)} style={{ width: 30, height: 30, borderRadius: 8, background: '#f7f4ef', border: 'none', color: '#bbb', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>⚙</button>
          <button onClick={logout} style={{ width: 30, height: 30, borderRadius: 8, background: '#f7f4ef', border: 'none', color: '#bbb', fontSize: 12, cursor: 'pointer' }}>로그아웃</button>
        </div>
      </div>
      {/* 가족 카드들 */}
      <div style={{ padding: '14px 14px 60px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {sortedFam.map(mem => {
          const ms = getMissions(mem.role)
          const own = isOwn(mem.role)
          const todayAll = ms.filter(m => ciByMission(m.id).has(TODAY)).length
          return (
            <div key={mem.role} style={{ background: '#fff', borderRadius: 18, overflow: 'hidden', border: `1.5px solid ${mem.col}22`, boxShadow: `0 2px 12px ${mem.col}10` }}>
              <div style={{ padding: '12px 16px 10px', background: mem.bg, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 26 }}>{mem.em}</span>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: mem.col }}>{own ? `${mem.name} (나)` : mem.name}</div>
                    <div style={{ fontSize: 11, color: mem.col + '99', marginTop: 1 }}>{ms.length === 0 ? '미션 없음' : `오늘 ${todayAll}/${ms.length}개 완료`}</div>
                  </div>
                </div>
                {own && ms.length < 3 && (
                  <button onClick={() => { setAddFor(mem.profile?.id || null); setShowAdd(true) }} style={{ width: 30, height: 30, borderRadius: 8, background: mem.col + '22', border: 'none', color: mem.col, fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>+</button>
                )}
              </div>
              {ms.length === 0
                ? <div style={{ padding: '20px', textAlign: 'center', color: '#ddd', fontSize: 13 }}>미션이 없어요</div>
                : <div style={{ padding: '10px 14px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {ms.map(m => {
                    const ciSet = ciByMission(m.id)
                    const todayCh = ciSet.has(TODAY)
                    const thisWkMon = monOf(new Date())
                    let wkCnt = 0
                    for (let d = new Date(thisWkMon); d <= new Date(); d = addDay(d, 1)) if (ciSet.has(fmt(d))) wkCnt++
                    const wkPct = Math.min(wkCnt / m.weekly_target, 1)
                    return (
                      <div key={m.id} onClick={() => { setDetMid(m.id); setCalYear(new Date().getFullYear()); setCalMonth(new Date().getMonth()); setScreen('detail') }} style={{ cursor: 'pointer' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 18 }}>{m.emoji}</span>
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#444' }}>{m.name}</span>
                            {m.is_primary && <span style={{ fontSize: 9, padding: '2px 5px', background: mem.col + '18', color: mem.col, borderRadius: 4, fontWeight: 700 }}>대표</span>}
                            {own && <span onClick={ev => { ev.stopPropagation(); setPrimary(m.id) }} style={{ fontSize: 12, color: m.is_primary ? mem.col : '#ddd', cursor: 'pointer', userSelect: 'none', lineHeight: 1 }}>★</span>}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 11, color: '#bbb' }}>{wkCnt}/{m.weekly_target}주</span>
                            {todayCh
                              ? <span style={{ fontSize: 11, padding: '2px 7px', background: mem.col + '18', color: mem.col, borderRadius: 5, fontWeight: 700 }}>✓ 완료</span>
                              : own && <span style={{ fontSize: 11, padding: '2px 7px', background: '#f5f5f5', color: '#ccc', borderRadius: 5 }}>미완료</span>}
                          </div>
                        </div>
                        <div style={{ height: 3, background: '#f0ede8', borderRadius: 2, marginBottom: 7, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${wkPct * 100}%`, background: mem.col, borderRadius: 2, transition: 'width .4s' }} />
                        </div>
                        <MiniGrid mission={m} ciSet={ciSet} col={mem.col} canEdit={own} onToggle={toggle} />
                      </div>
                    )
                  })}
                </div>
              }
            </div>
          )
        })}
      </div>
      {/* 탭 순서 설정 모달 */}
      {showTS && (
        <div onClick={ev => { if (ev.target === ev.currentTarget) setShowTS(false) }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ width: '100%', background: '#fff', borderRadius: '20px 20px 0 0', padding: '24px 20px 36px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontSize: 17, fontWeight: 700, color: '#333' }}>탭 순서 설정</span>
              <button onClick={() => setShowTS(false)} style={{ background: 'none', border: 'none', color: '#bbb', fontSize: 24, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ fontSize: 11, color: '#bbb', marginBottom: 16 }}>내 카드는 항상 첫 번째로 고정됩니다</div>
            {tabOrder.map((role, i) => {
              const cfg = FAMILY_CONFIG[role]
              const isSelf = role === myRole
              return (
                <div key={role} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: '#fafafa', borderRadius: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 22 }}>{cfg?.em}</span>
                  <span style={{ flex: 1, fontSize: 15, color: isSelf ? cfg?.col : '#555', fontWeight: isSelf ? 600 : 400 }}>{cfg?.name}{isSelf ? ' (나)' : ''}</span>
                  {isSelf
                    ? <span style={{ fontSize: 11, padding: '3px 10px', background: cfg?.col + '18', color: cfg?.col, borderRadius: 6 }}>고정</span>
                    : <div style={{ display: 'flex', gap: 6 }}>
                      {[[-1, '↑'] as const, [1, '↓'] as const].map(([d, l]) => {
                        const off = d === -1 ? i === 0 : i === tabOrder.length - 1
                        const newOrd = [...tabOrder]; if (!off) { [newOrd[i], newOrd[i + d]] = [newOrd[i + d], newOrd[i]] }
                        return <button key={d} onClick={() => !off && setTabOrder([...newOrd])} disabled={off} style={{ width: 32, height: 32, borderRadius: 6, background: '#eee', border: 'none', color: off ? '#ddd' : '#888', cursor: off ? 'default' : 'pointer', fontSize: 14 }}>{l}</button>
                      })}
                    </div>}
                </div>
              )
            })}
            <button onClick={() => { saveTabOrder(tabOrder); setShowTS(false) }} style={{ width: '100%', padding: '14px', background: '#333', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 700, color: '#fff', cursor: 'pointer', marginTop: 8 }}>저장</button>
          </div>
        </div>
      )}
      {showAdd && <AddModal onAdd={addMission} onClose={() => { setShowAdd(false); setAddFor(null) }} col={FAMILY_CONFIG[myRole || 'dad']?.col || '#FF8C42'} />}
    </div>
  )
}
