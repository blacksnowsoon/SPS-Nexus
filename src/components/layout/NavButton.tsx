import type { ReactNode } from 'react'

export interface NavButtonProps {
  active: boolean
  onClick: () => void
  icon: string
  title?: string
  collapsed?: boolean
  badge?: number
  children: ReactNode
}

export function NavButton({
  active,
  onClick,
  icon,
  title,
  collapsed = false,
  badge,
  children,
}: NavButtonProps) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={`relative flex items-center w-full rounded-xl text-xs font-medium transition-all ${
        collapsed
          ? 'justify-center p-2.5 max-md:p-1'
          : 'text-start gap-2.5 px-3 py-2.5'
      } ${
        active
          ? 'bg-blue-50 text-blue-700 font-semibold shadow-2xs'
          : 'text-slate-600 hover:bg-slate-100/70 hover:text-slate-900'
      } max-md:flex-col max-md:justify-center max-md:gap-0.5 max-md:p-1 max-md:text-[9px]`}
    >
      <span className="w-5 text-center text-md max-md:text-base leading-none shrink-0">{icon}</span>
      <div className={`flex items-center gap-2.5 flex-1 min-w-0 max-md:hidden ${collapsed ? 'hidden' : 'flex'}`}>
        {children}
      </div>
      {collapsed && typeof badge === 'number' && badge > 0 && (
        <span
          className="absolute top-1 inset-e-1 min-w-3.75 h-3.75 px-0.5 bg-blue-100 text-blue-700 border border-blue-200/80 rounded-full text-[9px] font-bold flex items-center justify-center leading-none max-md:hidden"
          title={`${badge}`}
        >
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </button>
  )
}
