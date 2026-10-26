import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { completionPercent, countExecutions, filterScenarios, isEditableWorkflow, nextWorkflowStatus } from './lib/checklist'
import { hasSupabaseConfig, supabase } from './lib/supabase'
import type {
  ExecutionStatus,
  Profile,
  Project,
  Round,
  RoundScenario,
  RoundStatus,
  RoundWorkflow,
  ScenarioExecution,
  ScenarioCatalogItem,
  ScenarioIssue,
  WorkflowStatus,
} from './types'
import './App.css'

type Page = 'overview' | 'scenarios' | 'issues' | 'rounds'

const statusLabels: Record<ExecutionStatus, string> = {
  not_tested: 'لم يُختبر',
  passed: 'ناجح',
  failed: 'فشل',
  not_applicable: 'لا ينطبق',
}

const workflowLabels: Record<WorkflowStatus, string> = {
  open: 'مفتوح',
  has_issues: 'لديه مشكلة',
  in_progress: 'قيد المعالجة',
  closed: 'مغلق',
}

const roundLabels: Record<RoundStatus, string> = {
  planned: 'مخطط',
  active: 'نشط',
  completed: 'مكتمل',
  archived: 'مؤرشف',
}

const statusClass: Record<ExecutionStatus, string> = {
  not_tested: 'muted',
  passed: 'success',
  failed: 'danger',
  not_applicable: 'neutral',
}

const workflowClass: Record<WorkflowStatus, string> = {
  open: 'success',
  has_issues: 'danger',
  in_progress: 'warning',
  closed: 'muted',
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium' }).format(new Date(value))
}

function ConfigScreen() {
  return (
    <main className="gate-page">
      <section className="gate-card">
        <div className="brand-mark">S</div>
        <p className="eyebrow">SPS NEXUS · UAT</p>
        <h1>إعداد الاتصال بقاعدة البيانات</h1>
        <p className="muted-copy">
          أضف رابط Supabase والمفتاح العام في ملف <code>.env</code> لتشغيل تسجيل الدخول والبيانات المشتركة.
        </p>
        <pre>VITE_SUPABASE_URL=https://your-project.supabase.co{'\n'}VITE_SUPABASE_ANON_KEY=your-anon-key</pre>
        <p className="security-note">لا تضع مفتاح service role أو سر Google OAuth في تطبيق المتصفح.</p>
      </section>
    </main>
  )
}

function SignInScreen({ onSignIn, busy, error }: { onSignIn: () => void; busy: boolean; error: string }) {
  return (
    <main className="gate-page">
      <section className="gate-card sign-in-card">
        <div className="brand-mark">S</div>
        <p className="eyebrow">SPS NEXUS · UAT WORKSPACE</p>
        <h1>اختبروا معًا، وتابعوا التقدم بوضوح.</h1>
        <p className="muted-copy">مساحة مشتركة لتنفيذ سيناريوهات القبول وإدارة الملاحظات بين فريق الاختبار والتطوير.</p>
        <button className="button button-primary google-button" onClick={onSignIn} disabled={busy}>
          <span className="google-g" aria-hidden="true">G</span>
          {busy ? 'جارٍ التحويل إلى Google…' : 'المتابعة باستخدام Google'}
        </button>
        {error && <p className="inline-error" role="alert">{error}</p>}
        <p className="security-note">يتطلب الدخول موافقة مسؤول النظام بعد تسجيل الدخول لأول مرة.</p>
      </section>
    </main>
  )
}

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [authError, setAuthError] = useState('')
  const [signingIn, setSigningIn] = useState(false)
  const [project, setProject] = useState<Project | null>(null)
  const [rounds, setRounds] = useState<Round[]>([])
  const [activeMemberCount, setActiveMemberCount] = useState(0)
  const [selectedRoundId, setSelectedRoundId] = useState('')
  const [scenarios, setScenarios] = useState<RoundScenario[]>([])
  const [workflows, setWorkflows] = useState<RoundWorkflow[]>([])
  const [executions, setExecutions] = useState<ScenarioExecution[]>([])
  const [issues, setIssues] = useState<ScenarioIssue[]>([])
  const [workspaceLoading, setWorkspaceLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState<Page>('overview')
  const [search, setSearch] = useState('')
  const [moduleFilter, setModuleFilter] = useState('')
  const [lifecycleFilter, setLifecycleFilter] = useState('')
  const [executionFilter, setExecutionFilter] = useState('')
  const [selectedScenarioId, setSelectedScenarioId] = useState('')
  const [busyAction, setBusyAction] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [issueDraft, setIssueDraft] = useState('')
  const [roundName, setRoundName] = useState('')
  const [roundDescription, setRoundDescription] = useState('')
  const [roundFormError, setRoundFormError] = useState('')
  const [scenarioCatalog, setScenarioCatalog] = useState<ScenarioCatalogItem[]>([])
  const [includeAllScenarios, setIncludeAllScenarios] = useState(true)
  const [selectedScenarioIds, setSelectedScenarioIds] = useState<string[]>([])
  const [scenarioPickerSearch, setScenarioPickerSearch] = useState('')
  const [editingScenario, setEditingScenario] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editSteps, setEditSteps] = useState('')
  const [editExpected, setEditExpected] = useState('')

  const user = session?.user
  const isAdmin = profile?.role === 'admin' && profile.status === 'active'
  const selectedRound = rounds.find((round) => round.id === selectedRoundId) ?? null
  const currentWorkflow = workflows.find((workflow) => workflow.scenario_id === selectedScenarioId)
  const currentExecution = executions.find((execution) => execution.scenario_id === selectedScenarioId)
  const selectedScenario = scenarios.find((scenario) => scenario.scenario_id === selectedScenarioId) ?? null
  const canExecute = Boolean(selectedRound?.status === 'active' && isEditableWorkflow(currentWorkflow?.status))
  const modules = useMemo(() => [...new Set(scenarios.map((scenario) => scenario.module))], [scenarios])

  const loadProfile = useCallback(async (userId: string) => {
    if (!supabase) return
    setProfileLoading(true)
    setProfileError('')
    const { data, error: queryError } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
    if (queryError) {
      setProfileError(`تعذر تحميل ملف المستخدم: ${queryError.message}`)
      setProfile(null)
    } else if (!data) {
      setProfileError('لم يُنشأ ملف المستخدم تلقائيًا. سجّل الخروج ثم أعد المحاولة أو تواصل مع مسؤول النظام.')
      setProfile(null)
    } else {
      setProfile(data)
    }
    setProfileLoading(false)
  }, [])

  useEffect(() => {
    if (!supabase) return

    let alive = true
    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!alive) return
      if (sessionError) setAuthError(sessionError.message)
      setSession(data.session)
      setAuthLoading(false)
      if (data.session?.user.id) void loadProfile(data.session.user.id)
    })

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setProfile(null)
      setProfileError('')
      if (nextSession?.user.id) {
        window.setTimeout(() => void loadProfile(nextSession.user.id), 0)
      } else {
        setProject(null)
        setRounds([])
        setScenarios([])
        setWorkflows([])
        setExecutions([])
        setIssues([])
      }
    })

    return () => {
      alive = false
      authListener.subscription.unsubscribe()
    }
  }, [loadProfile])

  const loadRoundContent = useCallback(async (roundId: string) => {
    if (!supabase || !roundId) return
    const [scenarioResult, workflowResult, executionResult, issueResult] = await Promise.all([
      supabase.from('round_scenarios').select('*').eq('round_id', roundId).is('removed_at', null).order('sort_order'),
      supabase.from('round_scenario_workflows').select('*').eq('round_id', roundId),
      supabase.from('scenario_executions').select('*').eq('round_id', roundId),
      supabase.from('scenario_issues').select('*').eq('round_id', roundId).order('created_at', { ascending: false }),
    ])
    const queryError = scenarioResult.error ?? workflowResult.error ?? executionResult.error ?? issueResult.error
    if (queryError) {
      setError(`تعذر تحميل بيانات الجولة: ${queryError.message}`)
      setScenarios([])
      setWorkflows([])
      setExecutions([])
      setIssues([])
      setWorkspaceLoading(false)
      return
    }
    setScenarios(scenarioResult.data ?? [])
    setWorkflows(workflowResult.data ?? [])
    setExecutions(executionResult.data ?? [])
    setIssues(issueResult.data ?? [])
    setWorkspaceLoading(false)
  }, [])

  const loadWorkspace = useCallback(async () => {
    if (!supabase || !user || profile?.status !== 'active') return
    const [projectResult, roundsResult, memberResult, catalogResult] = await Promise.all([
      supabase.from('projects').select('*').order('created_at').limit(1).maybeSingle(),
      supabase.from('rounds').select('*').order('created_at', { ascending: false }),
      isAdmin ? supabase.rpc('active_member_count', {}) : Promise.resolve({ data: 0, error: null }),
      supabase.from('scenarios').select('id,module,section,title,source_order').order('source_order'),
    ])
    const queryError = projectResult.error ?? roundsResult.error ?? memberResult.error ?? catalogResult.error
    if (queryError) {
      setError(`تعذر تحميل مساحة العمل: ${queryError.message}`)
      setWorkspaceLoading(false)
      return
    }
    setError('')
    const nextRounds = roundsResult.data ?? []
    setActiveMemberCount(memberResult.data ?? 0)
    setScenarioCatalog(catalogResult.data ?? [])
    setProject(projectResult.data)
    setRounds(nextRounds)
    setSelectedRoundId((current) => {
      if (current && nextRounds.some((round) => round.id === current)) return current
      return nextRounds.find((round) => round.status === 'active')?.id ?? nextRounds[0]?.id ?? ''
    })
    setWorkspaceLoading(false)
  }, [isAdmin, profile?.status, user])

  useEffect(() => {
    if (profile?.status !== 'active') return
    const request = window.setTimeout(() => void loadWorkspace(), 0)
    return () => window.clearTimeout(request)
  }, [loadWorkspace, profile?.status])

  useEffect(() => {
    if (!selectedRoundId || profile?.status !== 'active') return
    const request = window.setTimeout(() => void loadRoundContent(selectedRoundId), 0)
    return () => window.clearTimeout(request)
  }, [loadRoundContent, profile?.status, selectedRoundId])

  const signIn = async () => {
    if (!supabase) return
    setSigningIn(true)
    setAuthError('')
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (signInError) {
      setAuthError(`تعذر بدء تسجيل الدخول: ${signInError.message}`)
      setSigningIn(false)
    }
  }

  const signOut = async () => {
    if (!supabase) return
    const { error: signOutError } = await supabase.auth.signOut()
    if (signOutError) setError(`تعذر تسجيل الخروج: ${signOutError.message}`)
  }

  const refreshRound = async () => {
    setWorkspaceLoading(true)
    await loadWorkspace()
    if (selectedRoundId) await loadRoundContent(selectedRoundId)
  }

  const saveExecution = async (scenario: RoundScenario, status: ExecutionStatus, notes: string) => {
    if (!supabase || !user || !selectedRound || !canExecute) return
    setBusyAction(`execution-${scenario.scenario_id}`)
    setError('')
    const { data, error: saveError } = await supabase
      .from('scenario_executions')
      .upsert(
        {
          round_id: selectedRound.id,
          scenario_id: scenario.scenario_id,
          user_id: user.id,
          status,
          notes,
        },
        { onConflict: 'round_id,scenario_id,user_id' },
      )
      .select('*')
      .single()
    if (saveError) {
      setError(`تعذر حفظ نتيجة الاختبار: ${saveError.message}`)
    } else {
      setExecutions((current) => [
        ...current.filter((entry) => entry.scenario_id !== scenario.scenario_id || entry.user_id !== user.id),
        data,
      ])
      setSuccessMessage('تم حفظ نتيجة الاختبار.')
      window.setTimeout(() => setSuccessMessage(''), 2500)
    }
    setBusyAction('')
  }

  const reportIssue = async () => {
    if (!supabase || !selectedRound || !selectedScenario || !issueDraft.trim()) return
    setBusyAction('issue')
    setError('')
    const { error: issueError } = await supabase.rpc('report_scenario_issue', {
      p_round_id: selectedRound.id,
      p_scenario_id: selectedScenario.scenario_id,
      p_report: issueDraft.trim(),
    })
    if (issueError) {
      setError(`تعذر تسجيل المشكلة: ${issueError.message}`)
    } else {
      setIssueDraft('')
      setSuccessMessage('تم تسجيل المشكلة وإغلاق السيناريو للاختبار.')
      await loadRoundContent(selectedRound.id)
    }
    setBusyAction('')
  }

  const transitionWorkflow = async (workflow: RoundWorkflow, target: WorkflowStatus) => {
    if (!supabase || !selectedRound) return
    setBusyAction(`workflow-${workflow.scenario_id}`)
    const { error: transitionError } = await supabase.rpc('admin_transition_round_workflow', {
      p_round_id: selectedRound.id,
      p_scenario_id: workflow.scenario_id,
      p_status: target,
      p_issue_summary: workflow.issue_summary,
    })
    if (transitionError) {
      setError(`تعذر تحديث حالة المشكلة: ${transitionError.message}`)
    } else {
      await loadRoundContent(selectedRound.id)
      setSuccessMessage(`تم تحديث الحالة إلى «${workflowLabels[target]}».`)
    }
    setBusyAction('')
  }

  const saveScenario = async () => {
    if (!supabase || !selectedRound || !selectedScenario || !isAdmin) return
    const title = editTitle.trim()
    if (!title) {
      setError('عنوان السيناريو مطلوب.')
      return
    }
    setBusyAction('scenario-save')
    const { error: saveError } = await supabase.rpc('admin_update_round_scenario', {
      p_round_id: selectedRound.id,
      p_scenario_id: selectedScenario.scenario_id,
      p_title: title,
      p_description: editDescription.trim(),
      p_steps: editSteps.split('\n').map((line) => line.trim()).filter(Boolean),
      p_expected: editExpected.split('\n').map((line) => line.trim()).filter(Boolean),
    })
    if (saveError) {
      setError(`تعذر حفظ تعديل السيناريو: ${saveError.message}`)
    } else {
      setEditingScenario(false)
      await loadRoundContent(selectedRound.id)
      setSuccessMessage('تم تحديث السيناريو للجميع.')
    }
    setBusyAction('')
  }

  const createRound = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!supabase || !isAdmin) return
    const name = roundName.trim()
    if (!name) {
      setRoundFormError('اسم الجولة مطلوب.')
      return
    }
    if (!includeAllScenarios && selectedScenarioIds.length === 0) {
      setRoundFormError('اختر سيناريو واحدًا على الأقل لهذه الجولة.')
      return
    }
    setBusyAction('round-create')
    setRoundFormError('')
    const { data: roundId, error: createError } = await supabase.rpc('admin_create_round', {
      p_name: name,
      p_description: roundDescription.trim() || null,
      p_scenario_ids: includeAllScenarios ? null : selectedScenarioIds,
    })
    if (createError) {
      setRoundFormError(createError.message)
    } else {
      setRoundName('')
      setRoundDescription('')
      setSuccessMessage('تم إنشاء الجولة ونسخ السيناريوهات إليها.')
      setWorkspaceLoading(true)
      await loadWorkspace()
      if (roundId) setSelectedRoundId(roundId)
    }
    setBusyAction('')
  }

  const updateRoundStatus = async (round: Round, status: RoundStatus) => {
    if (!supabase || !isAdmin) return
    setBusyAction(`round-${round.id}`)
    const { error: updateError } = await supabase.rpc('admin_set_round_status', {
      p_round_id: round.id,
      p_status: status,
    })
    if (updateError) {
      setError(`تعذر تحديث الجولة: ${updateError.message}`)
    } else {
      setWorkspaceLoading(true)
      await loadWorkspace()
      setSuccessMessage(`تم تحديث الجولة إلى «${roundLabels[status]}».`)
    }
    setBusyAction('')
  }

  const selectScenario = (scenarioId: string) => {
    const scenario = scenarios.find((item) => item.scenario_id === scenarioId)
    if (scenario) {
      setEditTitle(scenario.title)
      setEditDescription(scenario.description)
      setEditSteps(scenario.steps.join('\n'))
      setEditExpected(scenario.expected.join('\n'))
    }
    setSelectedScenarioId(scenarioId)
    setEditingScenario(false)
  }

  if (!hasSupabaseConfig) return <ConfigScreen />
  if (authLoading || (session && profileLoading)) return <main className="gate-page"><div className="loading-card">جارٍ تحميل مساحة العمل…</div></main>
  if (!session) return <SignInScreen onSignIn={() => void signIn()} busy={signingIn} error={authError} />
  if (profileError) {
    return (
      <main className="gate-page">
        <section className="gate-card">
          <div className="brand-mark">S</div>
          <p className="eyebrow">تعذر تهيئة الحساب</p>
          <h1>لا يمكن فتح مساحة العمل</h1>
          <p className="inline-error" role="alert">{profileError}</p>
          <button className="button button-secondary" onClick={() => void signOut()}>تسجيل الخروج</button>
        </section>
      </main>
    )
  }
  if (profile?.status !== 'active') {
    return (
      <main className="gate-page">
        <section className="gate-card">
          <div className="brand-mark">S</div>
          <span className="status-badge warning">بانتظار التفعيل</span>
          <h1>حسابك قيد المراجعة</h1>
          <p className="muted-copy">تم تسجيل الدخول بنجاح. سيظهر المشروع بعد تفعيل حسابك يدويًا من مسؤول النظام.</p>
          <button className="button button-secondary" onClick={() => void signOut()}>تسجيل الخروج</button>
        </section>
      </main>
    )
  }

  const ownExecutions = executions.filter((execution) => execution.user_id === user?.id)
  const visibleScenarios = filterScenarios(
    scenarios,
    workflows,
    ownExecutions,
    search,
    moduleFilter,
    lifecycleFilter,
    executionFilter,
  )
  const myCounts = countExecutions(scenarios.length, ownExecutions)
  const teamCounts = countExecutions(scenarios.length * activeMemberCount, executions)
  const issueWorkflows = workflows.filter((workflow) => workflow.status !== 'open')
  const selectedIssues = issues.filter((issue) => issue.scenario_id === selectedScenarioId)

  return (
    <div className="app-shell" dir="rtl">
      <header className="topbar">
        <div className="topbar-brand">
          <div className="brand-mark small">S</div>
          <div><strong>SPS Nexus</strong><span>UAT Workspace</span></div>
        </div>
        <div className="topbar-actions">
          <div className="round-picker">
            <span>الجولة</span>
            <select aria-label="اختيار الجولة" value={selectedRoundId} onChange={(event) => { setWorkspaceLoading(Boolean(event.target.value)); setSelectedRoundId(event.target.value); setSelectedScenarioId(''); setEditingScenario(false) }}>
              <option value="">لا توجد جولات</option>
              {rounds.map((round) => <option key={round.id} value={round.id}>{round.name} · {roundLabels[round.status]}</option>)}
            </select>
          </div>
          <div className="user-chip">
            {profile?.avatar_url ? <img src={profile.avatar_url} alt="" /> : <span className="avatar-fallback">{(profile?.display_name || profile?.email || 'U').slice(0, 1).toUpperCase()}</span>}
            <span>{profile?.display_name || profile?.email}</span>
            <button className="text-button" onClick={() => void signOut()}>خروج</button>
          </div>
        </div>
      </header>

      <div className="workspace">
        <aside className="sidebar">
          <div className="project-card">
            <span className="project-icon">S</span>
            <div><small>المشروع</small><strong>{project?.name ?? 'SPS Nexus'}</strong></div>
            <span className="live-dot" title="مساحة مشتركة" />
          </div>
          <p className="nav-label">مساحة العمل</p>
          <nav className="side-nav" aria-label="التنقل الرئيسي">
            <NavButton active={page === 'overview'} onClick={() => setPage('overview')} icon="▦">نظرة عامة</NavButton>
            <NavButton active={page === 'scenarios'} onClick={() => setPage('scenarios')} icon="☷">السيناريوهات <span className="nav-count">{scenarios.length}</span></NavButton>
            <NavButton active={page === 'issues'} onClick={() => setPage('issues')} icon="⚑">المشكلات <span className="nav-count">{issueWorkflows.length}</span></NavButton>
            <NavButton active={page === 'rounds'} onClick={() => setPage('rounds')} icon="◷">الجولات</NavButton>
          </nav>
          <div className="sidebar-bottom">
            <div className="help-card"><span>↗</span><strong>تعملون على نفس السيناريوهات</strong><p>نتائج كل مختبِر خاصة به، وحالة المشكلة مشتركة مع الفريق.</p></div>
            <div className="side-user">
              <span className="avatar-fallback">{(profile?.display_name || 'U').slice(0, 1)}</span>
              <div><strong>{profile?.display_name || 'مستخدم'}</strong><small>{isAdmin ? 'مسؤول النظام' : 'مختبِر'}</small></div>
            </div>
          </div>
        </aside>

        <main className="main-content">
          <div className="content-heading">
            <div>
              <p className="eyebrow">{project?.name ?? 'SPS Nexus'}{selectedRound ? ` / ${selectedRound.name}` : ''}</p>
              <h1>{pageTitle(page)}</h1>
              <p className="muted-copy">{pageDescription(page, selectedRound, isAdmin)}</p>
            </div>
            <div className="heading-actions">
              {selectedRound && <span className={`status-badge ${selectedRound.status === 'active' ? 'success' : 'muted'}`}>{roundLabels[selectedRound.status]}</span>}
              <button className="button button-secondary" onClick={() => void refreshRound()} disabled={workspaceLoading}>
                <span aria-hidden="true">↻</span> تحديث
              </button>
            </div>
          </div>

          {error && <div className="alert alert-error" role="alert"><span>!</span>{error}<button onClick={() => setError('')} aria-label="إغلاق">×</button></div>}
          {successMessage && <div className="alert alert-success" role="status"><span>✓</span>{successMessage}<button onClick={() => setSuccessMessage('')} aria-label="إغلاق">×</button></div>}
          {workspaceLoading && <div className="loading-inline">جارٍ تحميل بيانات الجولة…</div>}

          {!selectedRound && !workspaceLoading && (
            <section className="empty-workspace">
              <div className="empty-icon">◷</div>
              <h2>لم تبدأ أي جولة بعد</h2>
              <p>{isAdmin ? 'أنشئ الجولة الأولى لنسخ السيناريوهات وإتاحتها لفريق الاختبار.' : 'سيظهر هنا العمل بمجرد أن ينشئ المسؤول جولة ويفعّلها.'}</p>
              {isAdmin && <button className="button button-primary" onClick={() => setPage('rounds')}>إنشاء جولة</button>}
            </section>
          )}

          {selectedRound && page === 'overview' && (
            <OverviewPage
              counts={myCounts}
              teamCounts={teamCounts}
              isAdmin={isAdmin}
              scenarioCount={scenarios.length}
              workflowCounts={issueWorkflows}
              round={selectedRound}
              onOpenScenarios={() => setPage('scenarios')}
              onOpenIssues={() => setPage('issues')}
              onSelectScenario={(scenarioId) => { selectScenario(scenarioId); setPage('scenarios') }}
              scenarios={scenarios}
              executions={ownExecutions}
            />
          )}

          {selectedRound && page === 'scenarios' && (
            <div className="scenario-layout">
              <section className="scenario-browser">
                <div className="filter-row">
                  <label className="search-field"><span aria-hidden="true">⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحث في السيناريوهات والخطوات…" /></label>
                  <select aria-label="تصفية حسب النظام" value={moduleFilter} onChange={(event) => setModuleFilter(event.target.value)}>
                    <option value="">كل الأنظمة</option>{modules.map((module) => <option key={module} value={module}>{module}</option>)}
                  </select>
                </div>
                <div className="filter-row secondary-filters">
                  <select aria-label="تصفية حالة السيناريو" value={lifecycleFilter} onChange={(event) => setLifecycleFilter(event.target.value)}>
                    <option value="">كل حالات المشكلة</option>
                    {Object.entries(workflowLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                  </select>
                  <select aria-label="تصفية نتيجة الاختبار" value={executionFilter} onChange={(event) => setExecutionFilter(event.target.value)}>
                    <option value="">كل نتائجك</option>
                    {Object.entries(statusLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                  </select>
                  <span className="results-count">{visibleScenarios.length} سيناريو</span>
                </div>
                {visibleScenarios.length === 0 ? <EmptyState title="لا توجد نتائج" body="جرّب تغيير البحث أو عوامل التصفية." /> : (
                  <div className="scenario-list">
                    {visibleScenarios.map((scenario) => {
                      const workflow = workflows.find((item) => item.scenario_id === scenario.scenario_id)
                      const execution = ownExecutions.find((item) => item.scenario_id === scenario.scenario_id)
                      return (
                        <button
                          className={`scenario-row ${selectedScenarioId === scenario.scenario_id ? 'selected' : ''}`}
                          key={scenario.scenario_id}
                          onClick={() => selectScenario(scenario.scenario_id)}
                        >
                          <span className={`scenario-number ${workflow?.status === 'has_issues' ? 'issue-number' : ''}`}>{scenario.source_number}</span>
                          <span className="scenario-row-main"><strong>{scenario.title}</strong><small>{scenario.module} <span>·</span> {scenario.section}</small></span>
                          <span className={`status-badge compact ${workflowClass[workflow?.status ?? 'open']}`}>{workflowLabels[workflow?.status ?? 'open']}</span>
                          <span className={`status-dot ${statusClass[execution?.status ?? 'not_tested']}`} title={statusLabels[execution?.status ?? 'not_tested']} />
                        </button>
                      )
                    })}
                  </div>
                )}
              </section>
              <ScenarioDetail
                scenario={selectedScenario}
                key={selectedScenario?.scenario_id ?? 'empty'}
                workflow={currentWorkflow}
                execution={currentExecution}
                issues={selectedIssues}
                isAdmin={isAdmin}
                canExecute={canExecute}
                busyAction={busyAction}
                issueDraft={issueDraft}
                onIssueDraftChange={setIssueDraft}
                onSaveExecution={(status, notes) => selectedScenario && void saveExecution(selectedScenario, status, notes)}
                onReportIssue={() => void reportIssue()}
                onTransition={(status) => currentWorkflow && void transitionWorkflow(currentWorkflow, status)}
                editing={editingScenario}
                editValues={{ title: editTitle, description: editDescription, steps: editSteps, expected: editExpected }}
                onEditValue={(field, value) => {
                  if (field === 'title') setEditTitle(value)
                  if (field === 'description') setEditDescription(value)
                  if (field === 'steps') setEditSteps(value)
                  if (field === 'expected') setEditExpected(value)
                }}
                onStartEditing={() => {
                  if (!selectedScenario) return
                  setEditTitle(selectedScenario.title)
                  setEditDescription(selectedScenario.description)
                  setEditSteps(selectedScenario.steps.join('\n'))
                  setEditExpected(selectedScenario.expected.join('\n'))
                  setEditingScenario(true)
                }}
                onCancelEditing={() => setEditingScenario(false)}
                onSaveScenario={() => void saveScenario()}
              />
            </div>
          )}

          {selectedRound && page === 'issues' && (
            <IssuesPage
              workflows={issueWorkflows}
              scenarios={scenarios}
              issues={issues}
              isAdmin={isAdmin}
              busyAction={busyAction}
              onOpenScenario={(scenarioId) => { selectScenario(scenarioId); setPage('scenarios') }}
              onTransition={(workflow, status) => void transitionWorkflow(workflow, status)}
            />
          )}

          {page === 'rounds' && (
            <RoundsPage
              rounds={rounds}
              selectedRoundId={selectedRoundId}
              isAdmin={isAdmin}
              roundName={roundName}
              roundDescription={roundDescription}
              formError={roundFormError}
              busyAction={busyAction}
              onRoundName={setRoundName}
              onRoundDescription={setRoundDescription}
              onCreateRound={(event) => void createRound(event)}
              onSelectRound={(roundId) => { setWorkspaceLoading(true); setSelectedRoundId(roundId); setSelectedScenarioId(''); setEditingScenario(false); setPage('overview') }}
              onUpdateStatus={(round, status) => void updateRoundStatus(round, status)}
              scenarioCatalog={scenarioCatalog}
              includeAllScenarios={includeAllScenarios}
              onIncludeAllScenarios={setIncludeAllScenarios}
              selectedScenarioIds={selectedScenarioIds}
              onSelectedScenarioIds={setSelectedScenarioIds}
              scenarioPickerSearch={scenarioPickerSearch}
              onScenarioPickerSearch={setScenarioPickerSearch}
            />
          )}
        </main>
      </div>
    </div>
  )
}

function NavButton({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: string; children: ReactNode }) {
  return <button className={`nav-item ${active ? 'active' : ''}`} onClick={onClick}><span className="nav-icon">{icon}</span>{children}</button>
}

function OverviewPage({
  counts, teamCounts, isAdmin, scenarioCount, workflowCounts, round, onOpenScenarios, onOpenIssues, onSelectScenario, scenarios, executions,
}: {
  counts: ReturnType<typeof countExecutions>
  teamCounts: ReturnType<typeof countExecutions>
  isAdmin: boolean
  scenarioCount: number
  workflowCounts: RoundWorkflow[]
  round: Round
  onOpenScenarios: () => void
  onOpenIssues: () => void
  onSelectScenario: (id: string) => void
  scenarios: RoundScenario[]
  executions: ScenarioExecution[]
}) {
  const failed = executions.filter((execution) => execution.status === 'failed')
  const openIssues = workflowCounts.filter((workflow) => workflow.status !== 'closed')
  const progress = completionPercent(counts)
  const teamProgress = completionPercent(teamCounts)
  return (
    <>
      <section className="welcome-banner">
        <div><span className="eyebrow">مرحبًا بعودتك</span><h2>خطوة بخطوة، نرفع جودة SPS Nexus.</h2><p>{round.name} · بدأت في {formatDate(round.created_at)}</p></div>
        <button className="button button-light" onClick={onOpenScenarios}>متابعة السيناريوهات <span>←</span></button>
        <div className="banner-orb orb-one" /><div className="banner-orb orb-two" />
      </section>
      <div className="section-title-row"><div><h2>ملخص الجولة</h2><p>حالة التنفيذ والمشكلات المفتوحة في هذه الجولة.</p></div><span className="eyebrow">محدّث من Supabase</span></div>
      <section className="stat-grid">
        <StatCard label="إجمالي السيناريوهات" value={scenarioCount} sub="في هذه الجولة" icon="☷" tone="blue" />
        <StatCard
          label={isAdmin ? 'تم تنفيذها · الفريق' : 'تم تنفيذها · أنت'}
          value={isAdmin ? teamCounts.passed + teamCounts.failed + teamCounts.not_applicable : counts.total - counts.not_tested}
          sub={`من أصل ${isAdmin ? teamCounts.total : counts.total}`}
          icon="✓"
          tone="green"
        />
        <StatCard label="لديها مشكلات" value={openIssues.length} sub="تحتاج متابعة" icon="⚑" tone="orange" />
        <StatCard label="نتائج فاشلة" value={isAdmin ? teamCounts.failed : failed.length} sub={isAdmin ? 'نتائج مرئية للفريق' : 'نتائجك أنت فقط'} icon="!" tone="red" />
      </section>
      <div className="dashboard-columns">
        <section className="panel progress-panel">
          <div className="panel-heading"><div><h3>{isAdmin ? 'تقدم الفريق' : 'تقدمك في الجولة'}</h3><p>{isAdmin ? 'مجموع نتائج تنفيذ المستخدمين المرئية' : 'نتائجك الشخصية في هذه الجولة'}</p></div><span className="progress-value">{isAdmin ? teamProgress : progress}%</span></div>
          <div className="progress-track"><span className="progress-passed" style={{ width: `${isAdmin ? teamProgress : progress}%` }} /></div>
          <div className="progress-legend"><span><i className="legend-dot success" /> ناجح <b>{isAdmin ? teamCounts.passed : counts.passed}</b></span><span><i className="legend-dot danger" /> فشل <b>{isAdmin ? teamCounts.failed : counts.failed}</b></span><span><i className="legend-dot muted" /> لم يُختبر <b>{isAdmin ? teamCounts.not_tested : counts.not_tested}</b></span></div>
          <div className="scope-note">ملاحظة: مقياس الفريق يعدّ كل نتيجة (مستخدم × سيناريو) على حدة.</div>
        </section>
        <section className="panel issue-summary">
          <div className="panel-heading"><div><h3>المشكلات النشطة</h3><p>سيناريوهات تتطلب متابعة الفريق</p></div><button className="link-button" onClick={onOpenIssues}>عرض الكل ←</button></div>
          {openIssues.length === 0 ? <p className="empty-inline">لا توجد مشكلات مفتوحة في هذه الجولة.</p> : openIssues.slice(0, 4).map((workflow) => {
            const scenario = scenarios.find((item) => item.scenario_id === workflow.scenario_id)
            return <button className="issue-preview" key={workflow.scenario_id} onClick={() => onSelectScenario(workflow.scenario_id)}><span className={`status-dot ${workflowClass[workflow.status]}`} /><span><strong>{scenario?.title ?? workflow.scenario_id}</strong><small>{workflowLabels[workflow.status]}</small></span><span>←</span></button>
          })}
        </section>
      </div>
      <div className="section-title-row compact-heading"><div><h2>نتائج تنفيذك</h2><p>حالات الاختبار التي سجلتها أنت.</p></div><button className="link-button" onClick={onOpenScenarios}>عرض السيناريوهات ←</button></div>
      <section className="panel recent-panel">
        {executions.length === 0 ? <EmptyState title="ابدأ تنفيذ السيناريوهات" body="اختر سيناريو وسجّل نتيجة الاختبار والملاحظات الخاصة بك." /> : executions.slice(0, 5).map((execution) => {
          const scenario = scenarios.find((item) => item.scenario_id === execution.scenario_id)
          return <button className="recent-row" key={execution.id} onClick={() => onSelectScenario(execution.scenario_id)}><span className={`status-icon ${statusClass[execution.status]}`}>{execution.status === 'passed' ? '✓' : execution.status === 'failed' ? '!' : '–'}</span><span className="recent-main"><strong>{scenario?.title ?? execution.scenario_id}</strong><small>{scenario?.module} · {scenario?.section}</small></span><span className={`status-badge compact ${statusClass[execution.status]}`}>{statusLabels[execution.status]}</span></button>
        })}
      </section>
    </>
  )
}

function StatCard({ label, value, sub, icon, tone }: { label: string; value: number; sub: string; icon: string; tone: string }) {
  return <article className="stat-card"><span className={`stat-icon ${tone}`}>{icon}</span><span className="stat-label">{label}</span><strong className="stat-value">{value}</strong><span className="stat-sub">{sub}</span></article>
}

function ScenarioDetail({
  scenario, workflow, execution, issues, isAdmin, canExecute, busyAction, issueDraft, onIssueDraftChange, onSaveExecution, onReportIssue, onTransition, editing, editValues, onEditValue, onStartEditing, onCancelEditing, onSaveScenario,
}: {
  scenario: RoundScenario | null
  workflow: RoundWorkflow | undefined
  execution: ScenarioExecution | undefined
  issues: ScenarioIssue[]
  isAdmin: boolean
  canExecute: boolean
  busyAction: string
  issueDraft: string
  onIssueDraftChange: (value: string) => void
  onSaveExecution: (status: ExecutionStatus, notes: string) => void
  onReportIssue: () => void
  onTransition: (status: WorkflowStatus) => void
  editing: boolean
  editValues: { title: string; description: string; steps: string; expected: string }
  onEditValue: (field: 'title' | 'description' | 'steps' | 'expected', value: string) => void
  onStartEditing: () => void
  onCancelEditing: () => void
  onSaveScenario: () => void
}) {
  const [notes, setNotes] = useState(execution?.notes ?? '')
  if (!scenario) return <aside className="detail-panel detail-empty"><div className="empty-icon">↖</div><h3>اختر سيناريو لعرض التفاصيل</h3><p>ستظهر هنا خطوات الاختبار والنتائج والملاحظات.</p></aside>
  const currentStatus = execution?.status ?? 'not_tested'
  const nextStatus = workflow ? nextWorkflowStatus(workflow.status) : null

  return (
    <aside className="detail-panel">
      <div className="detail-topline"><span className="detail-id">#{scenario.source_number}</span><span className={`status-badge ${workflowClass[workflow?.status ?? 'open']}`}>{workflowLabels[workflow?.status ?? 'open']}</span>{isAdmin && isEditableWorkflow(workflow?.status) && !editing && <button className="icon-button" onClick={onStartEditing} aria-label="تعديل السيناريو">✎</button>}</div>
      {editing ? (
        <div className="edit-form">
          <label>عنوان السيناريو<input value={editValues.title} onChange={(event) => onEditValue('title', event.target.value)} /></label>
          <label>الوصف<textarea rows={2} value={editValues.description} onChange={(event) => onEditValue('description', event.target.value)} /></label>
          <label>الخطوات <small>كل خطوة في سطر مستقل</small><textarea rows={4} value={editValues.steps} onChange={(event) => onEditValue('steps', event.target.value)} /></label>
          <label>النتائج المتوقعة <small>كل نتيجة في سطر مستقل</small><textarea rows={3} value={editValues.expected} onChange={(event) => onEditValue('expected', event.target.value)} /></label>
          <div className="detail-actions"><button className="button button-primary" onClick={onSaveScenario} disabled={busyAction === 'scenario-save'}>{busyAction === 'scenario-save' ? 'جارٍ الحفظ…' : 'حفظ التعديلات'}</button><button className="button button-secondary" onClick={onCancelEditing}>إلغاء</button></div>
        </div>
      ) : (
        <>
          <h2 className="detail-title">{scenario.title}</h2>
          <p className="detail-context">{scenario.module} <span>·</span> {scenario.section}{scenario.category && <> <span>·</span> {scenario.category}</>}</p>
          {scenario.description && <p className="detail-description">{scenario.description}</p>}
          <div className="detail-divider" />
          {scenario.steps.length > 0 && <DetailList title="خطوات الاختبار" items={scenario.steps} numbered />}
          {scenario.expected.length > 0 && <DetailList title="النتيجة المتوقعة" items={scenario.expected} />}
          <div className="detail-divider" />
          <section className="execution-section">
            <div className="panel-heading"><div><h3>نتيجة تنفيذك</h3><p>لا تؤثر على نتائج بقية المختبِرين.</p></div></div>
            <div className="execution-options">
              {(['passed', 'failed', 'not_applicable'] as const).map((status) => (
                <button
                  key={status}
                  className={`execution-option ${statusClass[status]} ${currentStatus === status ? 'chosen' : ''}`}
                  disabled={!canExecute || busyAction === `execution-${scenario.scenario_id}`}
                  onClick={() => onSaveExecution(currentStatus === status ? 'not_tested' : status, notes)}
                >
                  <span>{status === 'passed' ? '✓' : status === 'failed' ? '!' : '–'}</span>{statusLabels[status]}
                </button>
              ))}
            </div>
            <label className="notes-label">ملاحظاتك<textarea rows={3} value={notes} disabled={!canExecute} onChange={(event) => setNotes(event.target.value)} onBlur={() => { if (canExecute && notes !== (execution?.notes ?? '')) onSaveExecution(currentStatus, notes) }} placeholder="سجّل ملاحظاتك أو ما ظهر أثناء الاختبار…" /></label>
            {!canExecute && <p className="lock-note">التنفيذ مقفل لأن الجولة غير نشطة أو السيناريو لديه مشكلة.</p>}
            {canExecute && workflow?.status === 'open' && currentStatus === 'failed' && (
              <div className="issue-report">
                <label>إبلاغ عن مشكلة<textarea rows={2} value={issueDraft} onChange={(event) => onIssueDraftChange(event.target.value)} placeholder="صف المشكلة التي واجهتها…" /></label>
                <button className="button button-danger-outline" onClick={onReportIssue} disabled={!issueDraft.trim() || busyAction === 'issue'}>{busyAction === 'issue' ? 'جارٍ الإرسال…' : 'إرسال المشكلة وإغلاق السيناريو'}</button>
                <small>إرسال البلاغ ينقل حالة السيناريو إلى «لديه مشكلة» ويوقف التنفيذ مؤقتًا.</small>
              </div>
            )}
            {canExecute && workflow?.status === 'open' && currentStatus !== 'failed' && (
              <p className="lock-note">لتسجيل بلاغ مشكلة، سجّل نتيجة «لديه مشكلة» لهذا السيناريو أولًا.</p>
            )}
          </section>
          {issues.length > 0 && <section className="issue-history"><h3>بلاغات المشكلة</h3>{issues.map((issue) => <article key={issue.id}><small>{formatDate(issue.created_at)}</small><p>{issue.report}</p></article>)}</section>}
          {isAdmin && nextStatus && (
            <button className="button button-primary full-button" onClick={() => onTransition(nextStatus)} disabled={busyAction === `workflow-${scenario.scenario_id}`}>
              {busyAction === `workflow-${scenario.scenario_id}` ? 'جارٍ التحديث…' : nextStatus === 'in_progress' ? 'بدء المعالجة' : 'إغلاق المشكلة'}
            </button>
          )}
          {workflow?.status === 'closed' && <p className="closed-note">تم إغلاق هذه المشكلة. السيناريو محفوظ في سجل الجولة.</p>}
        </>
      )}
    </aside>
  )
}

function DetailList({ title, items, numbered = false }: { title: string; items: string[]; numbered?: boolean }) {
  return <section className="detail-list"><h3>{title}</h3><ol className={numbered ? '' : 'plain-list'}>{items.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ol></section>
}

function IssuesPage({
  workflows, scenarios, issues, isAdmin, busyAction, onOpenScenario, onTransition,
}: {
  workflows: RoundWorkflow[]
  scenarios: RoundScenario[]
  issues: ScenarioIssue[]
  isAdmin: boolean
  busyAction: string
  onOpenScenario: (id: string) => void
  onTransition: (workflow: RoundWorkflow, status: WorkflowStatus) => void
}) {
  if (workflows.length === 0) return <EmptyState title="لا توجد مشكلات في هذه الجولة" body="عند الإبلاغ عن مشكلة في سيناريو، ستظهر هنا للفريق." />
  return <section className="issue-list">{workflows.map((workflow) => {
    const scenario = scenarios.find((item) => item.scenario_id === workflow.scenario_id)
    const issue = issues.find((item) => item.scenario_id === workflow.scenario_id)
    const next = nextWorkflowStatus(workflow.status)
    return (
      <article className="panel issue-card" key={workflow.scenario_id}>
        <div className="issue-card-heading"><span className={`status-badge ${workflowClass[workflow.status]}`}>{workflowLabels[workflow.status]}</span><span className="detail-id">#{scenario?.source_number}</span></div>
        <h2>{scenario?.title ?? workflow.scenario_id}</h2>
        <p className="detail-context">{scenario?.module} · {scenario?.section}</p>
        {workflow.issue_summary && <p className="issue-summary-text">{workflow.issue_summary}</p>}
        {issue && <div className="issue-quote"><small>تفاصيل البلاغ · {formatDate(issue.created_at)}</small><p>{issue.report}</p></div>}
        <div className="issue-card-actions"><button className="button button-secondary" onClick={() => onOpenScenario(workflow.scenario_id)}>عرض السيناريو</button>{isAdmin && next && <button className="button button-primary" onClick={() => onTransition(workflow, next)} disabled={busyAction === `workflow-${workflow.scenario_id}`}>{next === 'in_progress' ? 'بدء المعالجة' : 'إغلاق المشكلة'}</button>}</div>
      </article>
    )
  })}</section>
}

function RoundsPage({
  rounds, selectedRoundId, isAdmin, roundName, roundDescription, formError, busyAction, onRoundName, onRoundDescription, onCreateRound, onSelectRound, onUpdateStatus,
  scenarioCatalog, includeAllScenarios, onIncludeAllScenarios, selectedScenarioIds, onSelectedScenarioIds, scenarioPickerSearch, onScenarioPickerSearch,
}: {
  rounds: Round[]
  selectedRoundId: string
  isAdmin: boolean
  roundName: string
  roundDescription: string
  formError: string
  busyAction: string
  onRoundName: (value: string) => void
  onRoundDescription: (value: string) => void
  onCreateRound: (event: FormEvent<HTMLFormElement>) => void
  onSelectRound: (id: string) => void
  onUpdateStatus: (round: Round, status: RoundStatus) => void
  scenarioCatalog: ScenarioCatalogItem[]
  includeAllScenarios: boolean
  onIncludeAllScenarios: (includeAll: boolean) => void
  selectedScenarioIds: string[]
  onSelectedScenarioIds: (ids: string[]) => void
  scenarioPickerSearch: string
  onScenarioPickerSearch: (value: string) => void
}) {
  const filteredCatalog = scenarioCatalog.filter((scenario) =>
    `${scenario.title} ${scenario.module} ${scenario.section}`.toLocaleLowerCase().includes(scenarioPickerSearch.trim().toLocaleLowerCase()),
  )
  return (
    <div className="rounds-layout">
      {isAdmin && <form className="panel round-create-form" onSubmit={onCreateRound}><div><h2>إنشاء جولة جديدة</h2><p>{includeAllScenarios ? `سيتم نسخ جميع السيناريوهات (${scenarioCatalog.length}) إلى الجولة.` : `تم اختيار ${selectedScenarioIds.length} سيناريو.`}</p></div><label>اسم الجولة<input value={roundName} onChange={(event) => onRoundName(event.target.value)} placeholder="مثال: اختبار القبول - الجولة الأولى" /></label><label>وصف (اختياري)<textarea rows={2} value={roundDescription} onChange={(event) => onRoundDescription(event.target.value)} placeholder="ما الذي تتضمنه هذه الجولة؟" /></label><label className="scenario-set-toggle"><input type="checkbox" checked={includeAllScenarios} onChange={(event) => onIncludeAllScenarios(event.target.checked)} /><span>إضافة كل السيناريوهات (افتراضي)</span></label>{!includeAllScenarios && <div className="scenario-picker"><input aria-label="البحث عن سيناريو" value={scenarioPickerSearch} onChange={(event) => onScenarioPickerSearch(event.target.value)} placeholder="ابحث بالعنوان أو النظام أو القسم…" /><div className="scenario-picker-list">{filteredCatalog.map((scenario) => <label key={scenario.id}><input type="checkbox" checked={selectedScenarioIds.includes(scenario.id)} onChange={(event) => onSelectedScenarioIds(event.target.checked ? [...selectedScenarioIds, scenario.id] : selectedScenarioIds.filter((id) => id !== scenario.id))} /><span><strong>{scenario.title}</strong><small>{scenario.module} · {scenario.section}</small></span></label>)}{filteredCatalog.length === 0 && <p className="empty-inline">لا توجد سيناريوهات مطابقة.</p>}</div></div>}{formError && <p className="inline-error">{formError}</p>}<button className="button button-primary" disabled={busyAction === 'round-create'}>{busyAction === 'round-create' ? 'جارٍ الإنشاء…' : 'إنشاء الجولة ونسخ السيناريوهات'}</button></form>}
      <section className="round-list">{rounds.length === 0 ? <EmptyState title="لا توجد جولات" body="ستظهر الجولات التي أنشأها المسؤول هنا." /> : rounds.map((round) => <article className={`panel round-card ${selectedRoundId === round.id ? 'current-round' : ''}`} key={round.id}><div className="round-card-top"><span className={`status-badge ${round.status === 'active' ? 'success' : 'muted'}`}>{roundLabels[round.status]}</span><span>{formatDate(round.created_at)}</span></div><h2>{round.name}</h2><p>{round.description || 'لا يوجد وصف لهذه الجولة.'}</p><div className="round-card-actions"><button className="button button-secondary" onClick={() => onSelectRound(round.id)}>فتح الجولة</button>{isAdmin && round.status === 'planned' && <button className="button button-primary" disabled={busyAction === `round-${round.id}`} onClick={() => onUpdateStatus(round, 'active')}>تفعيل</button>}{isAdmin && round.status === 'active' && <button className="button button-secondary" disabled={busyAction === `round-${round.id}`} onClick={() => onUpdateStatus(round, 'completed')}>إنهاء الجولة</button>}{isAdmin && round.status === 'completed' && <button className="button button-secondary" disabled={busyAction === `round-${round.id}`} onClick={() => onUpdateStatus(round, 'archived')}>أرشفة</button>}</div></article>)}</section>
    </div>
  )
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return <div className="empty-state"><span className="empty-icon">☷</span><h3>{title}</h3><p>{body}</p></div>
}

function pageTitle(page: Page): string {
  return { overview: 'نظرة عامة', scenarios: 'سيناريوهات الاختبار', issues: 'متابعة المشكلات', rounds: 'الجولات والسبرنتات' }[page]
}

function pageDescription(page: Page, round: Round | null, isAdmin: boolean): string {
  if (page === 'overview') return round ? `نظرة موحدة على التقدم والنتائج في «${round.name}».` : 'نظرة موحدة على التقدم والنتائج في الجولة الحالية.'
  if (page === 'scenarios') return 'نفّذ السيناريوهات وسجّل نتيجتك؛ بيانات كل مختبِر مستقلة.'
  if (page === 'issues') return isAdmin ? 'راجع البلاغات وحرّكها خلال مراحل المعالجة.' : 'تابع المشكلات التي أُبلغ عنها في الجولة.'
  return isAdmin ? 'أنشئ جولات الاختبار وأدر حالتها.' : 'استعرض جولات الاختبار وسجلها.'
}

export default App
