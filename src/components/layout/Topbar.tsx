import type { Profile, Round } from '../../types'
import { roundLabels } from '../constants'

export interface TopbarProps {
  rounds: Round[]
  selectedRoundId: string
  onSelectRoundId: (roundId: string) => void
  profile: Profile | null
  onSignOut: () => void
  isSidebarCollapsed?: boolean
  onToggleSidebar?: () => void
}

export function Topbar({
  rounds,
  selectedRoundId,
  onSelectRoundId,
  profile,
  onSignOut,
  isSidebarCollapsed,
  onToggleSidebar,
}: TopbarProps) {
  return (
    <header className="h-[72px] max-md:h-auto max-md:min-h-[60px] px-5 sm:px-8 max-md:py-2.5 flex items-center justify-between bg-white border-b border-slate-200/90 sticky top-0 z-30 shadow-2xs">
      <div className="flex items-center gap-3">
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            title={isSidebarCollapsed ? 'توسيع القائمة الجانبية' : 'طي القائمة الجانبية'}
            aria-label={isSidebarCollapsed ? 'توسيع القائمة الجانبية' : 'طي القائمة الجانبية'}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors max-md:hidden"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-white font-extrabold text-base bg-gradient-to-br from-blue-500 to-indigo-600 shadow-md shadow-blue-500/20">
          S
        </div>
        <div className="flex flex-col leading-tight">
          <strong className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">SPS Nexus</strong>
          <span className="text-[11px] text-slate-400 font-medium dir-ltr">UAT Workspace</span>
        </div>
      </div>

      <div className="flex items-center gap-4 sm:gap-7 max-md:gap-2.5">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="max-sm:hidden font-medium">الجولة</span>
          <select
            aria-label="اختيار الجولة"
            value={selectedRoundId}
            onChange={(event) => onSelectRoundId(event.target.value)}
            className="max-w-[270px] max-sm:max-w-[140px] bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
          >
            <option value="">لا توجد جولات</option>
            {rounds.map((round) => (
              <option key={round.id} value={round.id}>
                {round.name} · {roundLabels[round.status]}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-700 bg-slate-50/80 border border-slate-200/80 rounded-full px-2 py-1">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
          ) : (
            <span className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">
              {(profile?.display_name || profile?.email || 'U').slice(0, 1).toUpperCase()}
            </span>
          )}
          <span className="max-sm:hidden font-medium text-slate-700 truncate max-w-[120px]">
            {profile?.display_name || profile?.email}
          </span>
          <button
            className="text-xs text-blue-600 hover:text-blue-800 font-semibold px-1.5 py-0.5 rounded-md hover:bg-blue-50 transition-colors"
            onClick={onSignOut}
          >
            خروج
          </button>
        </div>
      </div>
    </header>
  )
}
