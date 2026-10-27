import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import { countExecutions, filterScenarios, isEditableWorkflow } from './lib/checklist'
import { hasSupabaseConfig, supabase } from './lib/supabase'
import type {
  ExecutionStatus,
  IssueExecutionNote,
  IssueReporter,
  Profile,
  Project,
  Round,
  RoundScenario,
  RoundStatus,
  RoundWorkflow,
  ScenarioCatalogItem,
  ScenarioExecution,
  ScenarioIssue,
  WorkflowStatus,
} from './types'
import { pageDescription, pageTitle, roundLabels, type Page } from './components/constants'
import { ConfigScreen } from './components/gate/ConfigScreen'
import { ProfileGateScreen } from './components/gate/ProfileGateScreen'
import { SignInScreen } from './components/gate/SignInScreen'
import { Topbar } from './components/layout/Topbar'
import { Sidebar } from './components/layout/Sidebar'
import { OverviewPage } from './components/pages/OverviewPage'
import { ScenariosPage } from './components/pages/ScenariosPage'
import { IssuesPage } from './components/pages/IssuesPage'
import { RoundsPage } from './components/pages/RoundsPage'
import './App.css'

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
  const [issueReporters, setIssueReporters] = useState<IssueReporter[]>([])
  const [issueExecutionNotes, setIssueExecutionNotes] = useState<IssueExecutionNote[]>([])
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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sps_sidebar_collapsed')
    return saved !== null ? saved === 'true' : true
  })

  const toggleSidebarCollapsed = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev
      localStorage.setItem('sps_sidebar_collapsed', String(next))
      return next
    })
  }

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
        setIssueReporters([])
        setIssueExecutionNotes([])
      }
    })

    return () => {
      alive = false
      authListener.subscription.unsubscribe()
    }
  }, [loadProfile])

  const loadRoundContent = useCallback(async (roundId: string) => {
    if (!supabase || !roundId) return
    const [scenarioResult, workflowResult, executionResult, issueResult, reporterResult, executionNotesResult] = await Promise.all([
      supabase.from('round_scenarios').select('*').eq('round_id', roundId).is('removed_at', null).order('sort_order'),
      supabase.from('round_scenario_workflows').select('*').eq('round_id', roundId),
      supabase.from('scenario_executions').select('*').eq('round_id', roundId),
      supabase.from('scenario_issues').select('*').eq('round_id', roundId).order('created_at', { ascending: false }),
      supabase.rpc('issue_reporters', { p_round_id: roundId }),
      isAdmin
        ? supabase.rpc('issue_execution_notes', { p_round_id: roundId })
        : Promise.resolve({ data: [] as IssueExecutionNote[], error: null }),
    ])
    const queryError =
      scenarioResult.error ??
      workflowResult.error ??
      executionResult.error ??
      issueResult.error ??
      reporterResult.error ??
      executionNotesResult.error
    if (queryError) {
      setError(`تعذر تحميل بيانات الجولة: ${queryError.message}`)
      setScenarios([])
      setWorkflows([])
      setExecutions([])
      setIssues([])
      setIssueReporters([])
      setIssueExecutionNotes([])
      setWorkspaceLoading(false)
      return
    }
    setScenarios(scenarioResult.data ?? [])
    setWorkflows(workflowResult.data ?? [])
    setExecutions(executionResult.data ?? [])
    setIssues(issueResult.data ?? [])
    setIssueReporters(reporterResult.data ?? [])
    setIssueExecutionNotes(executionNotesResult.data ?? [])
    setWorkspaceLoading(false)
  }, [isAdmin])

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
      setSuccessMessage(
        target === 'open' ? 'تمت إعادة السيناريو إلى المختبِر للتعديل.' : 'تم تحديث الحالة بنجاح.',
      )
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

  const updateRoundDetails = async (round: Round, name: string, description: string) => {
    if (!supabase || !isAdmin) return false
    if (!name.trim()) {
      setError('اسم الجولة مطلوب.')
      return false
    }
    setBusyAction(`round-${round.id}`)
    setError('')
    const { error: updateError } = await supabase.rpc('admin_update_round', {
      p_round_id: round.id,
      p_name: name.trim(),
      p_description: description.trim() || null,
    })
    if (updateError) {
      setError(`تعذر حفظ تعديلات الجولة: ${updateError.message}`)
      setBusyAction('')
      return false
    }
    setWorkspaceLoading(true)
    await loadWorkspace()
    setSuccessMessage('تم تحديث بيانات الجولة.')
    setBusyAction('')
    return true
  }

  const deleteRound = async (round: Round) => {
    if (!supabase || !isAdmin) return
    setBusyAction(`round-${round.id}`)
    setError('')
    const { error: deleteError } = await supabase.rpc('admin_delete_round', {
      p_round_id: round.id,
    })
    if (deleteError) {
      setError(`تعذر حذف الجولة: ${deleteError.message}`)
    } else {
      setWorkspaceLoading(true)
      await loadWorkspace()
      setSuccessMessage('تم حذف الجولة وبياناتها المرتبطة.')
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
  if (authLoading || (session && profileLoading)) {
    return (
      <main className="min-h-screen grid place-items-center p-6 bg-slate-50/80">
        <div className="w-full max-w-[440px] bg-white border border-slate-200/90 rounded-2xl shadow-xl p-8 text-center text-xs text-slate-500 font-medium flex items-center justify-center gap-2">
          <span className="animate-spin text-blue-600">↻</span> جارٍ تحميل مساحة العمل…
        </div>
      </main>
    )
  }
  if (!session) return <SignInScreen onSignIn={() => void signIn()} busy={signingIn} error={authError} />
  if (profileError) {
    return <ProfileGateScreen type="error" errorMessage={profileError} onSignOut={() => void signOut()} />
  }
  if (profile?.status !== 'active') {
    return <ProfileGateScreen type="pending" onSignOut={() => void signOut()} />
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
    <div className="min-h-screen bg-slate-50/60 text-slate-800" dir="rtl">
      <Topbar
        rounds={rounds}
        selectedRoundId={selectedRoundId}
        onSelectRoundId={(roundId) => {
          setWorkspaceLoading(Boolean(roundId))
          setSelectedRoundId(roundId)
          setSelectedScenarioId('')
          setEditingScenario(false)
        }}
        profile={profile}
        onSignOut={() => void signOut()}
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebar={toggleSidebarCollapsed}
      />

      <div
        className={`grid ${
          isSidebarCollapsed
            ? 'grid-cols-[68px_minmax(0,1fr)]'
            : 'grid-cols-[244px_minmax(0,1fr)] max-lg:grid-cols-[210px_minmax(0,1fr)]'
        } max-md:block max-md:pb-16 min-h-[calc(100vh-72px)] transition-[grid-template-columns] duration-200 ease-in-out`}
      >
        <Sidebar
          project={project}
          page={page}
          onPageChange={setPage}
          scenarioCount={scenarios.length}
          issueCount={issueWorkflows.length}
          profile={profile}
          isAdmin={isAdmin}
          collapsed={isSidebarCollapsed}
          onToggleCollapsed={toggleSidebarCollapsed}
        />

        <main className="max-w-[1540px] w-full mx-auto px-4 sm:px-8 lg:px-10 py-6 sm:py-8 lg:pb-16">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <p className="text-[11px] font-bold text-slate-400 tracking-wider uppercase m-0">
                {project?.name ?? 'SPS Nexus'}
                {selectedRound ? ` / ${selectedRound.name}` : ''}
              </p>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight my-1">
                {pageTitle(page)}
              </h1>
              <p className="text-xs text-slate-500 max-w-xl">
                {pageDescription(page, selectedRound, isAdmin)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {selectedRound && (
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold ${
                    selectedRound.status === 'active'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                      : 'bg-slate-100 text-slate-600 border border-slate-200/60'
                  }`}
                >
                  {roundLabels[selectedRound.status]}
                </span>
              )}
              <button
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 rounded-xl text-xs font-semibold shadow-2xs transition-colors disabled:opacity-50"
                onClick={() => void refreshRound()}
                disabled={workspaceLoading}
              >
                <span aria-hidden="true">↻</span> تحديث
              </button>
            </div>
          </div>

          {error && (
            <div
              className="flex items-center gap-2.5 text-xs text-rose-700 bg-rose-50 border border-rose-200/80 rounded-xl p-3 mb-4 shadow-xs"
              role="alert"
            >
              <span className="w-4 h-4 rounded-full bg-rose-500 text-white font-bold flex items-center justify-center text-[10px] shrink-0">
                !
              </span>
              <span className="flex-1">{error}</span>
              <button
                onClick={() => setError('')}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold px-1"
                aria-label="إغلاق"
              >
                ×
              </button>
            </div>
          )}
          {successMessage && (
            <div
              className="flex items-center gap-2.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200/80 rounded-xl p-3 mb-4 shadow-xs"
              role="status"
            >
              <span className="w-4 h-4 rounded-full bg-emerald-500 text-white font-bold flex items-center justify-center text-[10px] shrink-0">
                ✓
              </span>
              <span className="flex-1">{successMessage}</span>
              <button
                onClick={() => setSuccessMessage('')}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold px-1"
                aria-label="إغلاق"
              >
                ×
              </button>
            </div>
          )}
          {workspaceLoading && (
            <div className="text-xs text-slate-500 bg-white border border-slate-200/80 rounded-xl p-3 mb-4 shadow-xs flex items-center justify-center gap-2">
              <span className="animate-spin text-blue-600">↻</span> جارٍ تحميل بيانات الجولة…
            </div>
          )}

          {!selectedRound && !workspaceLoading && (
            <section className="bg-white border border-slate-200/90 rounded-2xl p-10 sm:p-14 text-center shadow-xs mt-6">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 font-bold text-xl flex items-center justify-center mx-auto mb-3">
                ◷
              </div>
              <h2 className="text-base font-bold text-slate-800 mb-1">لم تبدأ أي جولة بعد</h2>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mb-5 leading-relaxed">
                {isAdmin
                  ? 'أنشئ الجولة الأولى لنسخ السيناريوهات وإتاحتها لفريق الاختبار.'
                  : 'سيظهر هنا العمل بمجرد أن ينشئ المسؤول جولة ويفعّلها.'}
              </p>
              {isAdmin && (
                <button
                  className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs"
                  onClick={() => setPage('rounds')}
                >
                  إنشاء جولة
                </button>
              )}
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
              onSelectScenario={(scenarioId) => {
                selectScenario(scenarioId)
                setPage('scenarios')
              }}
              scenarios={scenarios}
              executions={ownExecutions}
            />
          )}

          {selectedRound && page === 'scenarios' && (
            <ScenariosPage
              scenarios={visibleScenarios}
              workflows={workflows}
              ownExecutions={ownExecutions}
              selectedScenarioId={selectedScenarioId}
              onSelectScenario={selectScenario}
              search={search}
              onSearchChange={setSearch}
              moduleFilter={moduleFilter}
              onModuleFilterChange={setModuleFilter}
              modules={modules}
              lifecycleFilter={lifecycleFilter}
              onLifecycleFilterChange={setLifecycleFilter}
              executionFilter={executionFilter}
              onExecutionFilterChange={setExecutionFilter}
              selectedScenario={selectedScenario}
              currentWorkflow={currentWorkflow}
              currentExecution={currentExecution}
              selectedIssues={selectedIssues}
              isAdmin={isAdmin}
              canExecute={canExecute}
              busyAction={busyAction}
              issueDraft={issueDraft}
              onIssueDraftChange={setIssueDraft}
              onSaveExecution={(status, notes) =>
                selectedScenario && void saveExecution(selectedScenario, status, notes)
              }
              onReportIssue={() => void reportIssue()}
              onTransition={(status) =>
                currentWorkflow && void transitionWorkflow(currentWorkflow, status)
              }
              editingScenario={editingScenario}
              editValues={{
                title: editTitle,
                description: editDescription,
                steps: editSteps,
                expected: editExpected,
              }}
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
          )}

          {selectedRound && page === 'issues' && (
            <IssuesPage
              key={selectedRound.id}
              workflows={issueWorkflows}
              scenarios={scenarios}
              issues={issues}
              reporters={issueReporters}
              executionNotes={issueExecutionNotes}
              roundName={selectedRound.name}
              roundIsActive={selectedRound.status === 'active'}
              isAdmin={isAdmin}
              busyAction={busyAction}
              onOpenScenario={(scenarioId) => {
                selectScenario(scenarioId)
                setPage('scenarios')
              }}
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
              onSelectRound={(roundId) => {
                setWorkspaceLoading(true)
                setSelectedRoundId(roundId)
                setSelectedScenarioId('')
                setEditingScenario(false)
                setPage('overview')
              }}
              onUpdateStatus={(round, status) => void updateRoundStatus(round, status)}
              onUpdateRound={updateRoundDetails}
              onDeleteRound={(round) => void deleteRound(round)}
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

export default App
