import { LogIn, UserPlus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useAuth } from "../context/AuthContext";

type AuthMode = "login" | "register";

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    if (error.message.includes("auth/invalid-credential")) {
      return "Username atau password tidak sesuai.";
    }

    if (error.message.includes("auth/email-already-in-use")) {
      return "Username ini sudah dipakai.";
    }

    if (error.message.includes("auth/operation-not-allowed")) {
      return "Login password belum aktif di Firebase Authentication.";
    }

    return error.message;
  }

  return "Login belum berhasil. Coba lagi sebentar.";
}

export function LoginPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<AuthMode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      if (mode === "login") {
        await login(username, password);
      } else {
        await register(username, password);
      }
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-panel panel">
        <div className="brand auth-brand">
          <span className="brand-mark">CS</span>
          <div>
            <strong>CS Assistant</strong>
            <small>Private customer workspace</small>
          </div>
        </div>

        <div className="section-title">
          <span className="eyebrow">Account access</span>
          <h1>{mode === "login" ? "Login" : "Buat Akun"}</h1>
        </div>

        <div className="segmented-control auth-mode">
          <button
            className={mode === "login" ? "active" : ""}
            type="button"
            onClick={() => {
              setMode("login");
              setError("");
            }}
          >
            Login
          </button>
          <button
            className={mode === "register" ? "active" : ""}
            type="button"
            onClick={() => {
              setMode("register");
              setError("");
            }}
          >
            Daftar
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Username
            <input
              autoComplete="username"
              required
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="contoh: cs_ferren"
            />
          </label>

          <label>
            Password
            <input
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Minimal 6 karakter"
            />
          </label>

          {error && <div className="auth-error">{error}</div>}

          <button className="primary-button" type="submit" disabled={isSubmitting}>
            {mode === "login" ? <LogIn size={18} /> : <UserPlus size={18} />}
            {isSubmitting ? "Memproses..." : mode === "login" ? "Login" : "Daftar"}
          </button>
        </form>
      </section>
    </main>
  );
}
