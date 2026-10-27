import type { ExecutionStatus, IssueStatus, RoundStatus, WorkflowStatus } from '../types'

export type Page = 'overview' | 'scenarios' | 'issues' | 'rounds' | 'scenario-catalog'

export const statusLabels: Record<ExecutionStatus, string> = {
  not_tested: 'لم يُختبر',
  passed: 'ناجح',
  failed: 'فشل',
  not_applicable: 'لا ينطبق',
}

export const workflowLabels: Record<WorkflowStatus, string> = {
  open: 'مفتوح',
  has_issues: 'لديه مشكلة',
  in_progress: 'قيد المعالجة',
  closed: 'مغلق',
}

export const roundLabels: Record<RoundStatus, string> = {
  planned: 'مخطط',
  active: 'نشط',
  completed: 'مكتمل',
  archived: 'مؤرشف',
}

export const statusClass: Record<ExecutionStatus, string> = {
  not_tested: 'muted',
  passed: 'success',
  failed: 'danger',
  not_applicable: 'neutral',
}

export const workflowClass: Record<WorkflowStatus, string> = {
  open: 'success',
  has_issues: 'danger',
  in_progress: 'warning',
  closed: 'muted',
}

export const statusBadgeClasses: Record<ExecutionStatus, string> = {
  not_tested: 'bg-slate-100 text-slate-500 border border-slate-200/60',
  passed: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60',
  failed: 'bg-rose-50 text-rose-700 border border-rose-200/60',
  not_applicable: 'bg-slate-100 text-slate-600 border border-slate-200/60',
}

export const workflowBadgeClasses: Record<WorkflowStatus, string> = {
  open: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60',
  has_issues: 'bg-rose-50 text-rose-700 border border-rose-200/60',
  in_progress: 'bg-amber-50 text-amber-700 border border-amber-200/60',
  closed: 'bg-slate-100 text-slate-600 border border-slate-200/60',
}

export const statusDotClasses: Record<ExecutionStatus, string> = {
  not_tested: 'bg-slate-300',
  passed: 'bg-emerald-500',
  failed: 'bg-rose-500',
  not_applicable: 'bg-slate-400',
}

export const workflowDotClasses: Record<WorkflowStatus, string> = {
  open: 'bg-emerald-500',
  has_issues: 'bg-rose-500',
  in_progress: 'bg-amber-500',
  closed: 'bg-slate-400',
}

export const issueStatusLabels: Record<IssueStatus, string> = {
  open: 'مفتوح',
  returned: 'مُعاد للمبلّغ',
  resolved: 'تم الحل',
}

export const issueStatusBadgeClasses: Record<IssueStatus, string> = {
  open: 'bg-rose-50 text-rose-700 border border-rose-200/60',
  returned: 'bg-amber-50 text-amber-700 border border-amber-200/60',
  resolved: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60',
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium' }).format(new Date(value))
}

export function pageTitle(page: Page): string {
  return {
    overview: 'نظرة عامة',
    scenarios: 'سيناريوهات الاختبار',
    issues: 'متابعة المشكلات',
    rounds: 'الجولات والسبرنتات',
    'scenario-catalog': 'إدارة السيناريوهات',
  }[page]
}

export function pageDescription(page: Page, round: { name: string } | null, isAdmin: boolean): string {
  if (page === 'overview') {
    return round
      ? `نظرة موحدة على التقدم والنتائج في «${round.name}».`
      : 'نظرة موحدة على التقدم والنتائج في الجولة الحالية.'
  }
  if (page === 'scenarios') return 'نفّذ السيناريوهات وسجّل نتيجتك؛ بيانات كل مختبِر مستقلة.'
  if (page === 'issues') return isAdmin ? 'راجع البلاغات وحرّكها خلال مراحل المعالجة.' : 'تابع المشكلات التي أُبلغ عنها في الجولة.'
  if (page === 'scenario-catalog') return 'أضف وعدّل سيناريوهات الكتالوج المشترك للجولات الجديدة.'
  return isAdmin ? 'أنشئ جولات الاختبار وأدر حالتها.' : 'استعرض جولات الاختبار وسجلها.'
}
