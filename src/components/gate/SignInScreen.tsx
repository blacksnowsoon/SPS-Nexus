export interface SignInScreenProps {
  onSignIn: () => void
  busy: boolean
  error: string
}

export function SignInScreen({ onSignIn, busy, error }: SignInScreenProps) {
  return (
    <main className="min-h-screen grid place-items-center p-6 bg-slate-50/80">
      <section className="w-full max-w-[440px] bg-white border border-slate-200/90 rounded-2xl shadow-xl p-8 sm:p-10 text-slate-800">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-extrabold text-xl flex items-center justify-center shadow-lg shadow-blue-500/25 mb-6">
          S
        </div>
        <p className="text-[11px] font-bold text-blue-600 tracking-wider mb-2 uppercase">
          SPS NEXUS · UAT WORKSPACE
        </p>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-snug mb-2.5">
          اختبروا معًا، وتابعوا التقدم بوضوح.
        </h1>
        <p className="text-xs text-slate-500 leading-relaxed mb-6">
          مساحة مشتركة لتنفيذ سيناريوهات القبول وإدارة الملاحظات بين فريق الاختبار والتطوير.
        </p>
        <button
          className="w-full min-h-[44px] flex items-center justify-center gap-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-600/20 active:translate-y-0.5 transition-all disabled:opacity-50"
          onClick={onSignIn}
          disabled={busy}
        >
          <span className="w-5 h-5 rounded-full bg-white text-blue-600 font-extrabold text-xs flex items-center justify-center">
            G
          </span>
          {busy ? 'جارٍ التحويل إلى Google…' : 'المتابعة باستخدام Google'}
        </button>
        {error && (
          <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200/60 rounded-lg p-2.5 mt-3 leading-relaxed" role="alert">
            {error}
          </p>
        )}
        <p className="text-[11px] text-slate-400 mt-5 leading-relaxed">
          يتطلب الدخول موافقة مسؤول النظام بعد تسجيل الدخول لأول مرة.
        </p>
      </section>
    </main>
  )
}
