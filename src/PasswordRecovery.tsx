import { useState, type FormEvent } from "react";
import { supabase } from "./supabase";

export default function PasswordRecovery({ onFinished }: { onFinished: () => void }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const save = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    if (!supabase) { setError("Supabase not configured"); return; }
    if (password.length < 12 || password.length > 128) {
      setError("Password must be 12–128 characters."); return;
    }
    if (password !== confirm) { setError("Both passwords must match."); return; }
    setBusy(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setPassword(""); setConfirm("");
      setMessage("Password updated. You can now log in with the new password.");
      await supabase.auth.signOut();
      window.history.replaceState({}, "", window.location.pathname);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Password reset failed. Request a new email link.");
    } finally { setBusy(false); }
  };

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#f7f5fd", padding: 20 }}>
      <section style={{ background: "white", borderRadius: 14, padding: 24, maxWidth: 440, width: "100%" }}>
        <h2>Set New Password</h2>
        <p>Old password is not required. Use the link sent to your email.</p>
        {error && <p role="alert" style={{ color: "#b42318" }}>{error}</p>}
        {message ? (
          <><p role="status" style={{ color: "green" }}>{message}</p>
            <button type="button" onClick={onFinished}>Back to Login</button></>
        ) : (
          <form onSubmit={save} style={{ display: "grid", gap: 14 }}>
            <label>New Password
              <input type="password" required minLength={12} maxLength={128} autoComplete="new-password"
                value={password} onChange={e => setPassword(e.target.value)}
                style={{ display: "block", width: "100%", padding: 10, boxSizing: "border-box" }} />
            </label>
            <label>Confirm New Password
              <input type="password" required minLength={12} maxLength={128} autoComplete="new-password"
                value={confirm} onChange={e => setConfirm(e.target.value)}
                style={{ display: "block", width: "100%", padding: 10, boxSizing: "border-box" }} />
            </label>
            <button type="submit" disabled={busy}
              style={{ background: "#7048e8", color: "white", padding: 12, border: 0, borderRadius: 8 }}>
              {busy ? "Saving..." : "Save New Password"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
