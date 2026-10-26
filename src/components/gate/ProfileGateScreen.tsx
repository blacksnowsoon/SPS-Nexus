export interface ProfileGateScreenProps {
  type: 'error' | 'pending'
  errorMessage?: string
  onSignOut: () => void
}

export function ProfileGateScreen({ type, errorMessage, onSignOut }: ProfileGateScreenProps) {
  if (type === 'error') {
    return (
      <main className="min-h-screen grid place-items-center p-6 bg-slate-50/80">
        <section className="w-full max-w-[440px] bg-white border border-slate-200/90 rounded-2xl shadow-xl p-8 sm:p-9 text-slate-800">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-extrabold text-xl flex items-center justify-center shadow-lg shadow-blue-500/25 mb-6">
            S
          </div>
          <p className="text-[11px] font-bold text-rose-600 tracking-wider mb-2 uppercase">تعذر تهيئة الحساب</p>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mb-2.5">لا يمكن فتح مساحة العمل</h1>
          <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200/60 rounded-lg p-3 my-3 leading-relaxed" role="alert">
            {errorMessage}
          </p>
          <button
            className="mt-3 inline-flex items-center justify-center px-4 py-2 border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 rounded-xl text-xs font-semibold shadow-2xs transition-colors"
            onClick={onSignOut}
          >
            تسجيل الخروج
          </button>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-screen grid place-items-center p-6 bg-slate-50/80">
      <section className="w-full max-w-[440px] bg-white border border-slate-200/90 rounded-2xl shadow-xl p-8 sm:p-9 text-slate-800">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-extrabold text-xl flex items-center justify-center shadow-lg shadow-blue-500/25 mb-6">
          S
        </div>
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200/60 mb-2">
          بانتظار التفعيل
        </span>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mb-2.5">حسابك قيد المراجعة</h1>
        <p className="text-xs text-slate-500 leading-relaxed mb-5">
          تم تسجيل الدخول بنجاح. سيظهر المشروع بعد تفعيل حسابك يدويًا من مسؤول النظام.
        </p>
        <button
          className="inline-flex items-center justify-center px-4 py-2 border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 rounded-xl text-xs font-semibold shadow-2xs transition-colors"
          onClick={onSignOut}
        >
          تسجيل الخروج
        </button>
      </section>
    </main>
  )
}
