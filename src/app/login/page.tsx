import { LoginForm } from "./LoginForm";

export const metadata = { title: "Sign in · EcoSphere" };

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-b from-brand-400 to-env text-bg shadow-glow">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden="true">
              <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
              <path d="M2 21c0-3 1.85-5.36 5.08-6" />
            </svg>
          </div>
          <div className="font-display text-3xl font-semibold tracking-tight text-ink">
            Eco<span className="text-env">Sphere</span>
          </div>
          <div className="mt-1 text-sm text-faint">ESG Management Platform</div>
        </div>

        <div className="panel p-6 shadow-lift">
          <h1 className="mb-1 font-display text-xl font-semibold text-ink">Sign in</h1>
          <p className="mb-4 text-xs text-faint">Use your work account to continue.</p>
          <LoginForm />
        </div>

        <div className="mt-4 rounded-lg border border-border bg-panel2 p-3 text-[11px] leading-relaxed text-faint">
          <div className="mb-1 font-medium text-muted">
            Demo accounts — password <span className="text-ink">password</span>
          </div>
          superadmin@ecosphere.io · admin@ecosphere.io · manager@ecosphere.io · priya@ecosphere.io
        </div>
      </div>
    </div>
  );
}
