import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "./supabase";

type UserItem = { id: string; email: string; name: string; created_at: string };
const ADMIN_EMAIL = "rajapplicatoinuse@gmail.com";

export default function UserManagement({ email }: { email?: string }) {
  const isAdmin = email?.toLowerCase() === ADMIN_EMAIL;
  const [name, setName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const [users, setUsers] = useState<UserItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const call = async (payload: Record<string, string>) => {
    if (!supabase) throw new Error("Supabase not configured");
    const { data, error: invokeError } = await supabase.functions.invoke("admin-users", { body: payload });
    if (invokeError) throw new Error(data?.error || invokeError.message);
    if (data?.error) throw new Error(data.error);
    return data;
  };
  const refresh = async () => {
    try {
      const result = await call({ action: "list" });
      setUsers(result.users || []);
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to load users"); }
  };
  useEffect(() => { if (isAdmin) void refresh(); }, [isAdmin]);

  const create = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isAdmin || busy) return;
    setBusy(true); setError(""); setMessage("");
    try {
      await call({ action: "create", name, email: newEmail, password });
      setMessage(`User ${newEmail} created. Share the temporary password privately.`);
      setName(""); setNewEmail(""); setPassword("");
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to create user"); }
    finally { setBusy(false); }
  };
  if (!isAdmin) return null;
  const inputStyle = { display: "block", width: "100%", maxWidth: 440, padding: 10, marginTop: 5, boxSizing: "border-box" as const };
  return <section className="panel">
    <h2>User Management — Create Viewer</h2>
    <p>Admin only. New users can sign in using their email and password. Do not share passwords in public chats.</p>
    <form onSubmit={create} style={{ display: "grid", gap: 12, maxWidth: 460 }}>
      <label>Full Name<input style={inputStyle} required minLength={2} maxLength={100} value={name} onChange={e => setName(e.target.value)} /></label>
      <label>User Email<input style={inputStyle} type="email" required value={newEmail} onChange={e => setNewEmail(e.target.value)} /></label>
      <label>Temporary Password (minimum 12 characters)<input style={inputStyle} type="password" required minLength={12} autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} /></label>
      <button type="submit" disabled={busy} style={{ background: "#7048e8", color: "white", border: 0, borderRadius: 8, padding: 12, cursor: "pointer" }}>{busy ? "Creating..." : "Create User"}</button>
    </form>
    {error && <p role="alert" style={{ color: "#b42318" }}>{error}</p>}
    {message && <p role="status" style={{ color: "#177245" }}>{message}</p>}
    <h3>Users ({users.length})</h3>
    <button type="button" onClick={() => void refresh()}>Refresh Users</button>
    <div style={{ overflowX: "auto", marginTop: 10 }}><table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead><tr>{["Name", "Email", "Role", "Created"].map(h => <th key={h} style={{ padding: 9, textAlign: "left", borderBottom: "1px solid #ddd" }}>{h}</th>)}</tr></thead>
      <tbody>{users.map(u => <tr key={u.id}><td style={{ padding: 9 }}>{u.name}</td><td style={{ padding: 9 }}>{u.email}</td><td style={{ padding: 9 }}>Viewer*</td><td style={{ padding: 9 }}>{new Date(u.created_at).toLocaleDateString("en-IN")}</td></tr>)}</tbody>
    </table></div>
    <p style={{ fontSize: 12, color: "#666" }}>*This screen creates Viewer users. Database RLS policies must also enforce read-only access.</p>
  </section>;
}
