import { ArrowRight, Package } from "lucide-react";
import { SignIn, SignUp, useAuth } from "@clerk/react";
import { Link, Redirect } from "wouter";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export function LoadingPage() {
  return (
    <main
      aria-busy="true"
      aria-label="Loading account"
      className="dark flex min-h-screen items-center justify-center bg-background text-foreground"
    >
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-400/30 border-t-indigo-400" />
    </main>
  );
}

export function LandingPage() {
  return (
    <main className="dark relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-5 py-12 text-foreground">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-40 top-[-10rem] h-[30rem] w-[30rem] rounded-full bg-indigo-600/20 blur-[100px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-52 -right-24 h-[34rem] w-[34rem] rounded-full bg-cyan-500/10 blur-[120px]"
      />

      <div className="relative z-10 w-full max-w-5xl">
        <header className="mb-20 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-950/40">
            <Package size={23} strokeWidth={2.2} />
          </span>
          <span className="text-lg font-semibold tracking-tight">
            Smart Inventory
          </span>
        </header>

        <section className="grid items-center gap-12 md:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-indigo-400/20 bg-indigo-400/10 px-3 py-1.5 text-xs font-medium text-indigo-200">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
              Your inventory, in focus
            </div>
            <h1 className="max-w-xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
              A clearer view of what you have in stock.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-slate-400">
              Keep products, quantities, and reorder points together in one
              place. Sign in to open your existing inventory workspace.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/login"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 text-sm font-semibold text-white shadow-lg shadow-indigo-950/40 transition-colors hover:bg-indigo-500"
              >
                Sign in to your account
                <ArrowRight size={16} />
              </Link>
              <Link
                href="/register"
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-700 bg-slate-900/60 px-5 text-sm font-medium text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-800"
              >
                Create an account
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-700/70 bg-slate-900/60 p-6 shadow-2xl shadow-black/20 backdrop-blur-sm">
            <div className="flex items-center justify-between border-b border-slate-700/70 pb-5">
              <div>
                <p className="text-sm font-medium text-slate-100">
                  Smart Inventory
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Your workspace is ready
                </p>
              </div>
              <span className="rounded-lg border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-xs text-cyan-200">
                Secure sign-in
              </span>
            </div>
            <div className="space-y-3 pt-5">
              {[
                "View stock levels and reorder thresholds",
                "Search and manage your product catalog",
                "Import and export inventory as CSV",
              ].map((feature) => (
                <div
                  key={feature}
                  className="flex items-center gap-3 rounded-lg border border-slate-700/50 bg-slate-950/40 px-4 py-3 text-sm text-slate-300"
                >
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                  {feature}
                </div>
              ))}
            </div>
            <p className="mt-5 text-xs leading-5 text-slate-500">
              Your existing products and dashboard are available after you sign
              in.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

export function SignInPage() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return <LoadingPage />;
  if (isSignedIn) return <Redirect to="/dashboard" />;

  return (
    <main className="dark relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-12 text-foreground">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-44 top-[-12rem] h-[30rem] w-[30rem] rounded-full bg-indigo-600/20 blur-[110px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-48 -right-24 h-[32rem] w-[32rem] rounded-full bg-cyan-500/10 blur-[120px]"
      />
      <div className="relative z-10 w-full max-w-[440px]">
        <Link
          href="/"
          className="mb-8 flex items-center justify-center gap-3 text-lg font-semibold tracking-tight text-slate-100"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-950/40">
            <Package size={21} strokeWidth={2.2} />
          </span>
          Smart Inventory
        </Link>
        <SignIn
          routing="path"
          path={`${basePath}/sign-in`}
          signUpUrl={`${basePath}/sign-up`}
          forceRedirectUrl={`${basePath}/dashboard`}
        />
        <p className="mt-6 text-center text-xs text-slate-500">
          Secure access to your inventory workspace
        </p>
      </div>
    </main>
  );
}

export function SignUpPage() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return <LoadingPage />;
  if (isSignedIn) return <Redirect to="/dashboard" />;

  return (
    <main className="dark relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-12 text-foreground">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-44 top-[-12rem] h-[30rem] w-[30rem] rounded-full bg-indigo-600/20 blur-[110px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-48 -right-24 h-[32rem] w-[32rem] rounded-full bg-cyan-500/10 blur-[120px]"
      />
      <div className="relative z-10 w-full max-w-[440px]">
        <Link
          href="/"
          className="mb-8 flex items-center justify-center gap-3 text-lg font-semibold tracking-tight text-slate-100"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-950/40">
            <Package size={21} strokeWidth={2.2} />
          </span>
          Smart Inventory
        </Link>
        <SignUp
          routing="path"
          path={`${basePath}/sign-up`}
          signInUrl={`${basePath}/sign-in`}
          forceRedirectUrl={`${basePath}/dashboard`}
        />
        <p className="mt-6 text-center text-xs text-slate-500">
          Create an account to access the inventory workspace
        </p>
      </div>
    </main>
  );
}
