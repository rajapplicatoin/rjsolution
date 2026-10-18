import { useEffect, useState } from "react";
import { supabase } from "./supabase";

type UploadItem = { id: string; file_name: string; uploaded_at: string | null; total_rows: number | null };
type Preview = { rows: number; sales_amount: number };
type Mode = "upload" | "month" | "range";
const adminEmail = "rajapplicatoinuse@gmail.com";
const money = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const btn = { padding: "10px 16px", background: "#7048e8", color: "white", border: 0, borderRadius: 8, cursor: "pointer" } as const;

export default function SalesDataManager({ email, onDeleted }: { email?: string; onDeleted: () => void }) {
  const [mode, setMode] = useState<Mode>("upload");
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [value, setValue] = useState("");
  const [endDate, setEndDate] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const isAdmin = email?.toLowerCase() === adminEmail;

  const loadUploads = async () => {
    if (!supabase || !isAdmin) return;
    const { data, error: e } = await supabase.from("sales_uploads")
      .select("id,file_name,uploaded_at,total_rows").order("uploaded_at", { ascending: false }).limit(500);
    if (e) setError(`Upload History: ${e.message}`);
    else setUploads((data ?? []) as UploadItem[]);
  };
  useEffect(() => { void loadUploads(); }, [isAdmin]);
  const changeMode = (m: Mode) => { setMode(m); setValue(""); setEndDate(""); setPreview(null); setConfirmation(""); setError(""); setMessage(""); };
  const changeValue = (v: string) => { setValue(v); setPreview(null); setConfirmation(""); setMessage(""); };
  const run = async (confirm: boolean) => {
    if (!supabase || !value || (mode === "range" && !endDate)) { setError("પહેલાં પસંદગી પૂર્ણ કરો."); return; }
    setBusy(true); setError(""); setMessage("");
    try {
      const { data, error: e } = await supabase.rpc("manage_sales_delete", {
        p_mode: mode, p_value: value, p_end_date: mode === "range" ? endDate : null, p_confirm: confirm
      });
      if (e) throw e;
      if (confirm) {
        setMessage(`${Number(data.deleted_rows)} Sales Rows કાયમ માટે Delete થઈ. Deleted Sales: ${money(Number(data.deleted_sales_amount))}`);
        setPreview(null); setConfirmation(""); setValue(""); setEndDate("");
        await loadUploads(); onDeleted();
      } else {
        setPreview({ rows: Number(data.rows), sales_amount: Number(data.sales_amount) });
        setConfirmation("");
      }
    } catch (e) { setError(e instanceof Error ? e.message : "Operation failed"); }
    finally { setBusy(false); }
  };
  if (!isAdmin) return <section className="panel"><h2>Sales Data Management</h2><p>Admin access only.</p></section>;
  return <section className="panel">
    <h2>Sales Data Management — Permanent Delete</h2>
    <p style={{ color: "#a4262c" }}><strong>ચેતવણી:</strong> Delete થયેલો Data પાછો Restore નહીં થાય. Delete પહેલાં Excel ની Copy તમારી પાસે રાખો.</p>
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 15 }}>
      {([ ["upload", "By Excel Upload"], ["month", "By Month"], ["range", "By Date Range"] ] as const).map(([m, label]) =>
        <button type="button" key={m} onClick={() => changeMode(m)} style={{ ...btn, background: mode === m ? "#7048e8" : "#ede8fa", color: mode === m ? "white" : "#493282" }}>{label}</button>)}
    </div>
    {mode === "upload" && <label>Excel Upload પસંદ કરો <select value={value} onChange={e => changeValue(e.target.value)} style={{ display: "block", width: "100%", maxWidth: 550, padding: 10, marginTop: 6 }}>
      <option value="">-- Select Upload --</option>
      {uploads.map(u => <option key={u.id} value={u.id}>{u.file_name} | {u.total_rows ?? 0} rows | {u.uploaded_at ? new Date(u.uploaded_at).toLocaleString("en-IN") : ""}</option>)}
    </select></label>}
    {mode === "month" && <label>Month પસંદ કરો <input type="month" value={value} onChange={e => changeValue(e.target.value)} style={{ display: "block", padding: 10, marginTop: 6 }}/></label>}
    {mode === "range" && <div style={{ display: "flex", gap: 15, flexWrap: "wrap" }}>
      <label>From Date <input type="date" value={value} onChange={e => changeValue(e.target.value)} style={{ display: "block", padding: 10, marginTop: 6 }}/></label>
      <label>To Date <input type="date" value={endDate} onChange={e => { setEndDate(e.target.value); setPreview(null); setConfirmation(""); }} style={{ display: "block", padding: 10, marginTop: 6 }}/></label>
    </div>}
    <div style={{ marginTop: 16 }}><button type="button" style={btn} disabled={busy || !value || (mode === "range" && !endDate)} onClick={() => void run(false)}>{busy ? "Please wait..." : "Preview Delete"}</button></div>
    {preview && <div style={{ padding: 15, background: "#fff4ef", borderRadius: 10, marginTop: 15 }}>
      <strong>Delete Preview: {preview.rows.toLocaleString("en-IN")} Rows | {money(preview.sales_amount)} Sales</strong>
      <p>આ Records Database માંથી કાયમ માટે દૂર થશે.</p>
      <label>ખાતરી માટે <strong>DELETE</strong> લખો: <input value={confirmation} onChange={e => setConfirmation(e.target.value)} placeholder="DELETE" style={{ padding: 9, marginLeft: 8 }}/></label>
      <div style={{ marginTop: 12 }}><button type="button" disabled={busy || confirmation !== "DELETE" || (preview.rows === 0 && mode !== "upload")} onClick={() => void run(true)} style={{ ...btn, background: "#bd2535" }}>Permanently Delete</button></div>
    </div>}
    {error && <p role="alert" style={{ color: "#bd2535" }}>{error}</p>}
    {message && <p role="status" style={{ color: "#23744b" }}>{message}</p>}
  </section>;
}
