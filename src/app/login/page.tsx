import { LoginForm } from "./LoginForm";

export const metadata = { title: "Sign in · EcoSphere" };

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg p-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="text-2xl font-semibold text-overall">EcoSphere</div>
          <div className="text-sm text-faint">ESG Management Platform</div>
        </div>

        <div className="panel p-6">
          <h1 className="mb-1 text-lg font-semibold text-ink">Sign in</h1>
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
