import type { ReactNode } from 'react'

export interface NavButtonProps {
  active: boolean
  onClick: () => void
  icon: string
  children: ReactNode
}

export function NavButton({ active, onClick, icon, children }: NavButtonProps) {
  return (
    <button
      className={`flex items-center gap-2.5 w-full text-start rounded-xl px-3 py-2.5 text-xs font-medium transition-all ${
        active
          ? 'bg-blue-50 text-blue-700 font-semibold shadow-2xs'
          : 'text-slate-600 hover:bg-slate-100/70 hover:text-slate-900'
      } max-md:flex-col max-md:justify-center max-md:gap-0.5 max-md:p-1 max-md:text-[9px]`}
      onClick={onClick}
    >
      <span className="w-5 text-center text-sm max-md:text-base leading-none">{icon}</span>
      {children}
    </button>
  )
}
