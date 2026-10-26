import type { Profile, Project } from '../../types'
import type { Page } from '../constants'
import { NavButton } from './NavButton'

export interface SidebarProps {
  project: Project | null
  page: Page
  onPageChange: (page: Page) => void
  scenarioCount: number
  issueCount: number
  profile: Profile | null
  isAdmin: boolean
}

export function Sidebar({
  project,
  page,
  onPageChange,
  scenarioCount,
  issueCount,
  profile,
  isAdmin,
}: SidebarProps) {
  return (
    <aside className="bg-white border-e border-slate-200/90 p-4 min-h-[calc(100vh-72px)] flex flex-col max-md:fixed max-md:bottom-0 max-md:inset-x-0 max-md:min-h-0 max-md:h-[62px] max-md:z-20 max-md:border-t max-md:border-e-0 max-md:p-1 max-md:bg-white/95 max-md:backdrop-blur-sm">
      <div className="p-3 gap-2.5 border border-slate-200/80 bg-slate-50/80 rounded-xl flex items-center max-md:hidden">
        <span className="w-8 h-8 rounded-lg bg-blue-900 text-white font-bold flex items-center justify-center text-xs shadow-xs">
          S
        </span>
        <div className="flex flex-col min-w-0 flex-1">
          <small className="text-[10px] text-slate-400 font-medium">المشروع</small>
          <strong className="text-xs font-semibold text-slate-800 truncate">{project?.name ?? 'SPS Nexus'}</strong>
        </div>
        <span className="w-2 h-2 rounded-full bg-emerald-500 ring-4 ring-emerald-100" title="مساحة مشتركة" />
      </div>

      <p className="mt-6 mb-2 mx-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider max-md:hidden">
        مساحة العمل
      </p>

      <nav
        className="grid gap-1 max-md:grid-cols-4 max-md:h-full max-md:items-center max-md:gap-0.5"
        aria-label="التنقل الرئيسي"
      >
        <NavButton active={page === 'overview'} onClick={() => onPageChange('overview')} icon="▦">
          <span>نظرة عامة</span>
        </NavButton>
        <NavButton active={page === 'scenarios'} onClick={() => onPageChange('scenarios')} icon="☷">
          <span>السيناريوهات</span>
          <span className="ms-auto bg-slate-100 text-slate-600 rounded-full px-1.5 py-0.2 text-[10px] font-semibold max-md:hidden">
            {scenarioCount}
          </span>
        </NavButton>
        <NavButton active={page === 'issues'} onClick={() => onPageChange('issues')} icon="⚑">
          <span>المشكلات</span>
          <span className="ms-auto bg-slate-100 text-slate-600 rounded-full px-1.5 py-0.2 text-[10px] font-semibold max-md:hidden">
            {issueCount}
          </span>
        </NavButton>
        <NavButton active={page === 'rounds'} onClick={() => onPageChange('rounds')} icon="◷">
          <span>الجولات</span>
        </NavButton>
      </nav>

      <div className="mt-auto max-md:hidden">
        <div className="border border-blue-100 bg-blue-50/60 rounded-xl p-3.5 my-4">
          <span className="text-blue-600 text-lg float-left font-bold">↗</span>
          <strong className="text-[11px] font-semibold text-slate-800 block">تعملون على نفس السيناريوهات</strong>
          <p className="text-[10px] text-slate-500 leading-relaxed mt-1.5">
            نتائج كل مختبِر خاصة به، وحالة المشكلة مشتركة مع الفريق.
          </p>
        </div>

        <div className="flex items-center gap-2.5 border-t border-slate-200/90 pt-3.5 px-1">
          <span className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center">
            {(profile?.display_name || 'U').slice(0, 1)}
          </span>
          <div className="flex flex-col min-w-0 flex-1">
            <strong className="text-[11px] font-semibold text-slate-800 truncate">
              {profile?.display_name || 'مستخدم'}
            </strong>
            <small className="text-[10px] text-slate-400 font-medium">
              {isAdmin ? 'مسؤول النظام' : 'مختبِر'}
            </small>
          </div>
        </div>
      </div>
    </aside>
  )
}
