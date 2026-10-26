export function ConfigScreen() {
  return (
    <main className="min-h-screen grid place-items-center p-6 bg-slate-50/80">
      <section className="w-full max-w-[440px] bg-white border border-slate-200/90 rounded-2xl shadow-xl p-8 sm:p-9 text-slate-800">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-extrabold text-xl flex items-center justify-center shadow-lg shadow-blue-500/25 mb-6">
          S
        </div>
        <p className="text-[11px] font-bold text-blue-600 tracking-wider mb-2 uppercase">SPS NEXUS · UAT</p>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mb-2.5">
          إعداد الاتصال بقاعدة البيانات
        </h1>
        <p className="text-xs text-slate-500 leading-relaxed mb-5">
          أضف رابط Supabase والمفتاح العام في ملف <code>.env</code> لتشغيل تسجيل الدخول والبيانات المشتركة.
        </p>
        <pre className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 text-xs text-slate-700 dir-ltr text-left font-mono whitespace-pre-wrap leading-relaxed">
          VITE_SUPABASE_URL=https://your-project.supabase.co{'\n'}VITE_SUPABASE_ANON_KEY=your-anon-key
        </pre>
        <p className="text-[11px] text-slate-400 mt-4 leading-relaxed">
          لا تضع مفتاح service role أو سر Google OAuth في تطبيق المتصفح.
        </p>
      </section>
    </main>
  )
}
