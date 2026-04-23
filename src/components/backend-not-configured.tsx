export function BackendNotConfigured() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 px-4">
      <div className="w-full max-w-md rounded-3xl bg-white/5 p-8 text-center shadow-2xl ring-1 ring-white/10">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-4xl">
          ⚙️
        </div>
        <h1 className="text-2xl font-bold text-white">Backend não configurado</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">
          Este app precisa de um projeto Supabase para funcionar. Configure as variáveis de ambiente
          e faça o deploy novamente.
        </p>
        <div className="mt-6 rounded-xl bg-slate-800/60 p-4 text-left font-mono text-xs text-slate-300">
          <p className="text-slate-500"># .env</p>
          <p className="mt-1">
            VITE_SUPABASE_URL=<span className="text-amber-400">https://xxx.supabase.co</span>
          </p>
          <p>
            VITE_SUPABASE_PUBLISHABLE_KEY=<span className="text-amber-400">eyJ...</span>
          </p>
          <p>
            SUPABASE_SERVICE_ROLE_KEY=<span className="text-amber-400">eyJ...</span>
          </p>
        </div>
        <p className="mt-4 text-xs text-slate-500">
          Instruções completas em{" "}
          <code className="rounded bg-slate-700 px-1 py-0.5 text-slate-300">SETUP.md</code>
        </p>
      </div>
    </div>
  );
}
