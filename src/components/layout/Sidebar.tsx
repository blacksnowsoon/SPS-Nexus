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
  collapsed?: boolean
  onToggleCollapsed?: () => void
}

export function Sidebar({
  project,
  page,
  onPageChange,
  scenarioCount,
  issueCount,
  profile,
  isAdmin,
  collapsed = false,
  onToggleCollapsed,
}: SidebarProps) {
  return (
    <aside
      className={`bg-white border-e border-slate-200/90 min-h-[calc(100vh-72px)] flex flex-col transition-all duration-200 ${
        collapsed ? 'w-17 p-2.5' : 'p-4'
      } max-md:fixed max-md:bottom-0 max-md:inset-x-0 max-md:min-h-0 max-md:h-15.5 max-md:w-auto max-md:z-20 max-md:border-t max-md:border-e-0 max-md:p-1 max-md:bg-white/95 max-md:backdrop-blur-sm`}
    >
      {!collapsed ? (
        <div className="flex items-center justify-between gap-1.5 max-md:hidden">
          <div className="p-2.5 gap-2.5 border border-slate-200/80 bg-slate-50/80 rounded-xl flex items-center min-w-0 flex-1">
            <span className="w-8 h-8 rounded-lg bg-blue-900 text-white font-bold flex items-center justify-center text-xs shadow-xs shrink-0">
              S
            </span>
            <div className="flex flex-col min-w-0 flex-1">
              <small className="text-[10px] text-slate-400 font-medium leading-none">المشروع</small>
              <strong className="text-xs font-semibold text-slate-800 truncate">
                {project?.name ?? 'SPS Nexus'}
              </strong>
            </div>
            <span
              className="w-2 h-2 rounded-full bg-emerald-500 ring-4 ring-emerald-100 shrink-0"
              title="مساحة مشتركة"
            />
          </div>
          {onToggleCollapsed && (
            <button
              type="button"
              onClick={onToggleCollapsed}
              title="طي القائمة الجانبية"
              aria-label="طي القائمة الجانبية"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 max-md:hidden w-full">
          <div
            className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-center relative cursor-default"
            title={`المشروع: ${project?.name ?? 'SPS Nexus'}`}
          >
            <span className="w-7 h-7 rounded-lg bg-blue-900 text-white font-bold flex items-center justify-center text-xs shadow-xs">
              S
            </span>
            <span
              className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white absolute top-1 end-1"
              title="مساحة مشتركة"
            />
          </div>
          {onToggleCollapsed && (
            <button
              type="button"
              onClick={onToggleCollapsed}
              title="توسيع القائمة الجانبية"
              aria-label="توسيع القائمة الجانبية"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
        </div>
      )}

      {collapsed ? (
        <div className="w-8 h-px bg-slate-200 my-3 mx-auto max-md:hidden" />
      ) : (
        <p className="mt-6 mb-2 mx-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider max-md:hidden">
          مساحة العمل
        </p>
      )}

      <nav
        className={`grid gap-1 ${isAdmin ? 'max-md:grid-cols-5' : 'max-md:grid-cols-4'} max-md:h-full max-md:items-center max-md:gap-0.5`}
        aria-label="التنقل الرئيسي"
      >
        <NavButton
          active={page === 'overview'}
          onClick={() => onPageChange('overview')}
          icon="📈"
          title="نظرة عامة"
          collapsed={collapsed}
        >
          <span>نظرة عامة</span>
        </NavButton>

        <NavButton
          active={page === 'scenarios'}
          onClick={() => onPageChange('scenarios')}
          icon="🗃️"
          title={`السيناريوهات (${scenarioCount})`}
          collapsed={collapsed}
          badge={scenarioCount}
        >
          <span>السيناريوهات</span>
          <span className="ms-auto bg-slate-100 text-slate-600 rounded-full px-1.5 py-0.2 text-[10px] font-semibold max-md:hidden">
            {scenarioCount}
          </span>
        </NavButton>

        <NavButton
          active={page === 'issues'}
          onClick={() => onPageChange('issues')}
          icon="🚩"
          title={`المشكلات (${issueCount})`}
          collapsed={collapsed}
          badge={issueCount}
        >
          <span>المشكلات</span>
          <span className="ms-auto bg-slate-100 text-slate-600 rounded-full px-1.5 py-0.2 text-[10px] font-semibold max-md:hidden">
            {issueCount}
          </span>
        </NavButton>

        <NavButton
          active={page === 'rounds'}
          onClick={() => onPageChange('rounds')}
          icon="♻️"
          title="الجولات"
          collapsed={collapsed}
        >
          <span>الجولات</span>
        </NavButton>

        {isAdmin && (
          <NavButton
            active={page === 'scenario-catalog'}
            onClick={() => onPageChange('scenario-catalog')}
            icon="📝"
            title="إدارة السيناريوهات"
            collapsed={collapsed}
          >
            <span>إدارة السيناريوهات</span>
          </NavButton>
        )}
      </nav>

      <div className="mt-auto max-md:hidden">
        {!collapsed && (
          <div className="border border-blue-100 bg-blue-50/60 rounded-xl p-3.5 my-4">
            <span className="text-blue-600 text-lg float-left font-bold">↗</span>
            <strong className="text-[11px] font-semibold text-slate-800 block">
              تعملون على نفس السيناريوهات
            </strong>
            <p className="text-[10px] text-slate-500 leading-relaxed mt-1.5">
              نتائج كل مختبِر خاصة به، وحالة المشكلة مشتركة مع الفريق.
            </p>
          </div>
        )}

        <div
          className={`flex items-center gap-2.5 border-t border-slate-200/90 ${
            collapsed ? 'pt-3 justify-center' : 'pt-3.5 px-1'
          }`}
        >
          <span
            className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0 cursor-default"
            title={`${profile?.display_name || 'مستخدم'} (${isAdmin ? 'مسؤول النظام' : 'مختبِر'})`}
          >
            {(profile?.display_name || 'U').slice(0, 1)}
          </span>
          {!collapsed && (
            <div className="flex flex-col min-w-0 flex-1">
              <strong className="text-[11px] font-semibold text-slate-800 truncate">
                {profile?.display_name || 'مستخدم'}
              </strong>
              <small className="text-[10px] text-slate-400 font-medium">
                {isAdmin ? 'مسؤول النظام' : 'مختبِر'}
              </small>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
