import { useState } from "react";
import { StatusMessage } from "../components/StatusMessage";
import { authApi } from "../lib/authApi";
import { AuthLayout } from "./LoginPage";

interface RegisterPageProps {
  onRegistered: (email: string) => void;
  onLogin: () => void;
}

export function RegisterPage({ onRegistered, onLogin }: RegisterPageProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const user = await authApi.register(name, email, password);
      onRegistered(user.email);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not create your account. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout>
      {error && <StatusMessage kind="error">{error}</StatusMessage>}
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="form-label" htmlFor="register-name">Name</label>
          <input
            autoComplete="name"
            className="form-control"
            id="register-name"
            maxLength={120}
            onChange={(event) => setName(event.target.value)}
            required
            value={name}
          />
        </div>
        <div>
          <label className="form-label" htmlFor="register-email">Email</label>
          <input
            autoComplete="email"
            className="form-control"
            id="register-email"
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
        </div>
        <div>
          <label className="form-label" htmlFor="register-password">Password</label>
          <input
            autoComplete="new-password"
            className="form-control"
            id="register-password"
            maxLength={128}
            minLength={12}
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
          <p className="mt-1 text-xs text-slate-500">Use at least 12 characters.</p>
        </div>
        <button className="button-primary w-full" disabled={submitting} type="submit">
          {submitting ? "Creating account…" : "Create account"}
        </button>
      </form>
      <p className="mt-5 text-center text-sm text-slate-600">
        Already have an account?{" "}
        <button className="font-semibold text-indigo-700 hover:text-indigo-800" onClick={onLogin} type="button">
          Sign in
        </button>
      </p>
    </AuthLayout>
  );
}
