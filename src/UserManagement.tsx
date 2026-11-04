import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "./supabase";

type UserItem = { id: string; email: string; name: string; created_at: string; active: boolean };
const ADMIN_EMAIL = "rajapplicatoinuse@gmail.com";
const inputStyle = { display: "block", width: "100%", maxWidth: 440, padding: 10, marginTop: 5, boxSizing: "border-box" as const };
const buttonStyle = { background: "#7048e8", color: "white", border: 0, borderRadius: 8, padding: 10, cursor: "pointer" } as const;

export default function UserManagement({ email }: { email?: string }) {
  const isAdmin = email?.toLowerCase() === ADMIN_EMAIL;
  const [name, setName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const [users, setUsers] = useState<UserItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [confirmAdminPassword, setConfirmAdminPassword] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [userPassword, setUserPassword] = useState("");

  const call = async (payload: Record<string, unknown>) => {
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
      setMessage(`User ${newEmail} created. Share the password privately.`);
      setName(""); setNewEmail(""); setPassword("");
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to create user"); }
    finally { setBusy(false); }
  };
  const changeOwnPassword = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!supabase || !email || busy) return;
    if (newAdminPassword.length < 12 || newAdminPassword.length > 128 || newAdminPassword !== confirmAdminPassword) {
      setError("New password must be 12–128 characters and both entries must match."); return;
    }
    setBusy(true); setError(""); setMessage("");
    try {
      // Verify current password before allowing the change.
      const { error: verifyError } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
      if (verifyError) throw new Error("Current admin password is incorrect.");
      const { error: updateError } = await supabase.auth.updateUser({ password: newAdminPassword });
      if (updateError) throw updateError;
      setCurrentPassword(""); setNewAdminPassword(""); setConfirmAdminPassword("");
      setMessage("Admin password updated successfully.");
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to change password"); }
    finally { setBusy(false); }
  };
  const changeUserPassword = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedUser || busy) return;
    if (userPassword.length < 12 || userPassword.length > 128) { setError("Password must be 12–128 characters."); return; }
    if (!window.confirm(`Change password for ${selectedUser.email}?`)) return;
    setBusy(true); setError(""); setMessage("");
    try {
      await call({ action: "reset_password", user_id: selectedUser.id, password: userPassword });
      setMessage(`Password updated for ${selectedUser.email}. Share it privately.`);
      setSelectedUser(null); setUserPassword("");
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to reset user password"); }
    finally { setBusy(false); }
  };
  const toggleUser = async (u: UserItem) => {
    if (busy || !window.confirm(`${u.active ? "Deactivate" : "Activate"} ${u.email}?`)) return;
    setBusy(true); setError(""); setMessage("");
    try {
      await call({ action: "set_active", user_id: u.id, active: !u.active });
      setMessage(`${u.email} is now ${u.active ? "deactivated" : "active"}.`);
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to change user status"); }
    finally { setBusy(false); }
  };
  if (!isAdmin) return null;
  return <section className="panel">
    <h2>User Management</h2>
    <p>Admin only. Never share passwords in public chats.</p>
    {error && <p role="alert" style={{ color: "#b42318" }}>{error}</p>}
    {message && <p role="status" style={{ color: "#177245" }}>{message}</p>}

    <h3>Change Admin Password</h3>
    <form onSubmit={changeOwnPassword} style={{ display: "grid", gap: 10, maxWidth: 460 }}>
      <label>Current Password<input style={inputStyle} type="password" autoComplete="current-password" required value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} /></label>
      <label>New Password (minimum 12 characters)<input style={inputStyle} type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={newAdminPassword} onChange={e => setNewAdminPassword(e.target.value)} /></label>
      <label>Confirm New Password<input style={inputStyle} type="password" autoComplete="new-password" required value={confirmAdminPassword} onChange={e => setConfirmAdminPassword(e.target.value)} /></label>
      <button disabled={busy} style={buttonStyle}>Change Admin Password</button>
    </form>

    <h3 style={{ marginTop: 28 }}>Create Viewer</h3>
    <form onSubmit={create} style={{ display: "grid", gap: 12, maxWidth: 460 }}>
      <label>Full Name<input style={inputStyle} required minLength={2} maxLength={100} value={name} onChange={e => setName(e.target.value)} /></label>
      <label>User Email<input style={inputStyle} type="email" required value={newEmail} onChange={e => setNewEmail(e.target.value)} /></label>
      <label>Temporary Password (minimum 12 characters)<input style={inputStyle} type="password" required minLength={12} maxLength={128} autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} /></label>
      <button type="submit" disabled={busy} style={buttonStyle}>{busy ? "Working..." : "Create User"}</button>
    </form>

    <h3 style={{ marginTop: 28 }}>Users ({users.length})</h3>
    <button type="button" disabled={busy} onClick={() => void refresh()}>Refresh Users</button>
    <div style={{ overflowX: "auto", marginTop: 10 }}><table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead><tr>{["Name", "Email", "Status", "Created", "Actions"].map(h => <th key={h} style={{ padding: 9, textAlign: "left", borderBottom: "1px solid #ddd" }}>{h}</th>)}</tr></thead>
      <tbody>{users.map(u => <tr key={u.id}>
        <td style={{ padding: 9 }}>{u.name}</td><td style={{ padding: 9 }}>{u.email}</td>
        <td style={{ padding: 9 }}>{u.active ? "Active" : "Deactive"}</td>
        <td style={{ padding: 9 }}>{new Date(u.created_at).toLocaleDateString("en-IN")}</td>
        <td style={{ padding: 9, whiteSpace: "nowrap" }}>
          <button type="button" disabled={busy} onClick={() => { setSelectedUser(u); setUserPassword(""); setError(""); }}>Change Password</button>{" "}
          <button type="button" disabled={busy} onClick={() => void toggleUser(u)}>{u.active ? "Deactivate" : "Activate"}</button>
        </td>
      </tr>)}</tbody>
    </table></div>
    {selectedUser && <form onSubmit={changeUserPassword} style={{ marginTop: 18, padding: 16, border: "1px solid #ddd", borderRadius: 8, maxWidth: 460 }}>
      <h3>Change Password: {selectedUser.email}</h3>
      <label>New Password<input style={inputStyle} type="password" required minLength={12} maxLength={128} autoComplete="new-password" value={userPassword} onChange={e => setUserPassword(e.target.value)} /></label>
      <div style={{ display: "flex", gap: 10, marginTop: 12 }}><button type="submit" disabled={busy} style={buttonStyle}>Save New Password</button><button type="button" onClick={() => { setSelectedUser(null); setUserPassword(""); }}>Cancel</button></div>
    </form>}
    <p style={{ fontSize: 12, color: "#666" }}>Deactivated users cannot sign in. Apply the included SQL security policy to block existing sessions from reading sales data.</p>
  </section>;
}
