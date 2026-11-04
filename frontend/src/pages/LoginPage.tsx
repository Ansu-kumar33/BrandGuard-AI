import { useState } from "react";
import { AppIcon } from "../components/AppIcon";
import { StatusMessage } from "../components/StatusMessage";
import { authApi } from "../lib/authApi";
import type { AuthSession } from "../types/auth";

interface LoginPageProps {
  notice?: string;
  onLogin: (session: AuthSession) => void;
  onRegister: () => void;
}

export function LoginPage({ notice, onLogin, onRegister }: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      onLogin(await authApi.login(email, password));
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not sign in. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout>
      {notice && <StatusMessage kind="success">{notice}</StatusMessage>}
      {error && <StatusMessage kind="error">{error}</StatusMessage>}
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="form-label" htmlFor="login-email">Email</label>
          <input
            autoComplete="email"
            className="form-control"
            id="login-email"
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
        </div>
        <div>
          <label className="form-label" htmlFor="login-password">Password</label>
          <input
            autoComplete="current-password"
            className="form-control"
            id="login-password"
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
        </div>
        <button className="button-primary w-full" disabled={submitting} type="submit">
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="mt-5 text-center text-sm text-slate-600">
        New to BrandGuard?{" "}
        <button className="font-semibold text-indigo-700 hover:text-indigo-800" onClick={onRegister} type="button">
          Create an account
        </button>
      </p>
    </AuthLayout>
  );
}

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f8fc] px-5 py-10">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
        <div className="mb-7 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-white">
            <AppIcon name="shield" className="h-6 w-6" />
          </span>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-950">
            BrandGuard <span className="text-indigo-600">AI</span>
          </h1>
          <p className="mt-2 text-sm text-slate-500">Sign in to your private review workspace</p>
        </div>
        {children}
      </section>
    </main>
  );
}
