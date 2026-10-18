import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { LayoutDashboard, BarChart3, Upload, Settings, Package, Users, IndianRupee, Download, FileSpreadsheet, Database, TrendingUp, Filter, RotateCcw } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { downloadSalesTemplate } from "./salesTemplate";
import ExcelPreview from "./ExcelPreview";
import SalesDataManager from "./SalesDataManager";
import { supabase, isSupabaseConfigured } from "./supabase";
import type { Session } from "@supabase/supabase-js";

type Page = "dashboard" | "analysis" | "upload" | "admin";
type Sale = { month: string; customer: string; company: string; product: string; group: string; code: string; sm: string; order: string; area: string; city: string; pin: string; qty: number; amount: number; listValue: number };
type SalesRecord = {
  sale_month: string | null;
  sale_date: string | null;
  customer_name: string | null;
  company_name: string | null;
  product_name: string | null;
  product_group: string | null;
  product_code: string | null;
  sm_name: string | null;
  order_no: string | null;
  area: string | null;
  city: string | null;
  pin_code: string | null;
  quantity: number | string | null;
  sales_amount: number | string | null;
  list_value: number | string | null;
};
const str = (v: string | null) => (v ?? "").trim();
const num = (v: number | string | null) => Number(v ?? 0) || 0;
const mapSale = (r: SalesRecord): Sale => ({
  month: (r.sale_month || r.sale_date || "").slice(0, 7),
  customer: str(r.customer_name), company: str(r.company_name),
  product: str(r.product_name), group: str(r.product_group),
  code: str(r.product_code), sm: str(r.sm_name), order: str(r.order_no),
  area: str(r.area), city: str(r.city), pin: str(r.pin_code),
  qty: num(r.quantity), amount: num(r.sales_amount), listValue: num(r.list_value)
});

const formatMoney = (v:number) => "₹" + v.toLocaleString("en-IN", { maximumFractionDigits: 0 });
const formatNumber = (v:number) => v.toLocaleString("en-IN", { maximumFractionDigits: 2 });
const monthLabel = (s:string) => new Date(s+"-01T00:00:00").toLocaleDateString("en-IN", {month:"long",year:"numeric"});
const sum = (rows:Sale[], key:"amount"|"qty"|"listValue") => rows.reduce((t,r)=>t+r[key],0);
const unique = (rows:Sale[], key:keyof Sale) => new Set(rows.map(r=>String(r[key])).filter(Boolean)).size;
const dimensions = [
  { label:"Month", key:"month" }, { label:"Product", key:"product" }, { label:"Product Group", key:"group" },
  { label:"Party", key:"customer" }, { label:"Product Code", key:"code" }, { label:"SM", key:"sm" },
  { label:"Order", key:"order" }, { label:"Area", key:"area" }, { label:"City", key:"city" }, { label:"Pincode", key:"pin" }
] as const;
type FilterKey = typeof dimensions[number]["key"];
type Filters = Record<FilterKey,string[]>;
const emptyFilters = ():Filters => ({month:[],product:[],group:[],customer:[],code:[],sm:[],order:[],area:[],city:[],pin:[]});
const cardStyle = {background:"#fff",border:"1px solid #ebe8f5",borderRadius:16,padding:20,boxShadow:"0 4px 18px rgba(48,32,95,.04)"} as const;
const buttonStyle = {border:0,borderRadius:9,padding:"10px 15px",background:"#7048e8",color:"white",fontWeight:700,cursor:"pointer"} as const;

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [sales, setSales] = useState<Sale[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [dataError, setDataError] = useState("");
  const [page,setPage] = useState<Page>("dashboard");
  const [filters,setFilters] = useState<Filters>(emptyFilters);
  const [compare,setCompare] = useState<string[]>(["2026-04"]);
  const [actual,setActual] = useState<string[]>(["2026-05","2026-06"]);
  const [analysisKey,setAnalysisKey] = useState<"customer"|"company"|"product"|"sm"|"area"|"city">("customer");
  useEffect(() => {
    if (!supabase) { setAuthReady(true); return; }
    let active = true;
    supabase.auth.getSession().then(({data, error}) => {
      if (!active) return;
      if (error) setAuthError(error.message);
      setSession(data.session);
      setAuthReady(true);
    });
    const {data: {subscription}} = supabase.auth.onAuthStateChange((_event, next) => {
      if (active) setSession(next);
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!supabase || !session) { setSales([]); return; }
    const client = supabase;
    let cancelled = false;
    const load = async () => {
      setLoading(true); setDataError("");
      try {
        const all: Sale[] = [];
        const pageSize = 1000;
        for (let start = 0; ; start += pageSize) {
          const {data, error} = await client.from("sales_records")
            .select("sale_month,sale_date,customer_name,company_name,product_name,product_group,product_code,sm_name,order_no,area,city,pin_code,quantity,sales_amount,list_value")
            .order("id", {ascending:true})
            .range(start, start + pageSize - 1);
          if (error) throw error;
          if (cancelled) return;
          const batch = (data ?? []) as SalesRecord[];
          all.push(...batch.map(mapSale));
          if (batch.length < pageSize) break;
        }
        if (!cancelled) setSales(all);
      } catch (e) {
        if (!cancelled) { setSales([]); setDataError(e instanceof Error ? e.message : "Unable to load sales data"); }
      } finally { if (!cancelled) setLoading(false); }
    };
    void load();
    return () => { cancelled = true; };
  }, [session?.user.id, refreshKey]);

  const login = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) return;
    setAuthError(""); setSigningIn(true);
    const {error} = await supabase.auth.signInWithPassword({email:email.trim(), password});
    if (error) setAuthError(error.message);
    setSigningIn(false);
  };
  const logout = async () => { if (supabase) await supabase.auth.signOut(); };

  const months = [...new Set(sales.map(x=>x.month).filter(Boolean))].sort();
  const filtered = useMemo(()=>sales.filter(r=>dimensions.every(d=>filters[d.key].length===0 || filters[d.key].includes(r[d.key]))),[filters,sales]);
  const setSelection=(key:FilterKey,value:string)=>setFilters(old=>({...old,[key]:old[key].includes(value)?old[key].filter(v=>v!==value):[...old[key],value]}));
  const selectAll=(key:FilterKey)=>setFilters(old=>({...old,[key]:[...new Set(sales.map(r=>r[key]).filter(Boolean))]}));
  const unselectAll=(key:FilterKey)=>setFilters(old=>({...old,[key]:[]}));
  const reset=()=>setFilters(emptyFilters());
  const chartData=months.map(month=>({name:monthLabel(month),Sales:sum(filtered.filter(r=>r.month===month),"amount"),"List Value":sum(filtered.filter(r=>r.month===month),"listValue")}));
  const grouped = [...new Set(filtered.map(r=>analysisKey==="company" ? JSON.stringify([r.company,r.group]) : r[analysisKey]))].map(key=>{const [name,productGroup] = analysisKey==="company" ? JSON.parse(key) as [string,string] : [key,""];const rows=filtered.filter(r=>analysisKey==="company" ? r.company===name && r.group===productGroup : r[analysisKey]===name);return {name,productGroup,qty:sum(rows,"qty"),sales:sum(rows,"amount"),listValue:sum(rows,"listValue"),customers:unique(rows,"customer"),parts:unique(rows,"code")}}).sort((a,b)=>b.sales-a.sales);
  const compareRows=filtered.filter(r=>compare.includes(r.month));
  const actualRows=filtered.filter(r=>actual.includes(r.month));
  const compareSales=sum(compareRows,"amount");
  const actualSales=sum(actualRows,"amount");
  const difference=actualSales-compareSales;
  const nav=[{id:"dashboard" as Page,label:"Sales Dashboard",icon:LayoutDashboard},{id:"analysis" as Page,label:"Sales Analysis",icon:BarChart3},{id:"upload" as Page,label:"Data Upload",icon:Upload},{id:"admin" as Page,label:"Admin Panel",icon:Settings}];
  if (!isSupabaseConfigured) return <div style={{padding:32,fontFamily:"sans-serif"}}><h2>Supabase configuration missing</h2><p>GitHub Actions build માં VITE_SUPABASE_URL અને VITE_SUPABASE_PUBLISHABLE_KEY ઉમેરો અને ફરી Deploy કરો.</p></div>;
  if (!authReady) return <div style={{padding:32,fontFamily:"sans-serif"}}>Checking login...</div>;
  if (!session) return <div style={{minHeight:"100vh",display:"grid",placeItems:"center",background:"#f7f5fd",padding:20}}>
    <form onSubmit={login} style={{...cardStyle,width:"100%",maxWidth:390,display:"grid",gap:15}}>
      <h1 style={{margin:0,color:"#302153"}}>Sales Intelligence</h1>
      <p style={{margin:0,color:"#716a80"}}>Raj Agencies · Secure Login</p>
      <label>Email<input type="email" required autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} style={{display:"block",width:"100%",padding:12,marginTop:5,boxSizing:"border-box"}}/></label>
      <label>Password<input type="password" required autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} style={{display:"block",width:"100%",padding:12,marginTop:5,boxSizing:"border-box"}}/></label>
      {authError && <p role="alert" style={{color:"#b42318",margin:0}}>{authError}</p>}
      <button type="submit" disabled={signingIn} style={buttonStyle}>{signingIn?"Signing in...":"Login"}</button>
    </form>
  </div>;
  return <div className="app" style={{minHeight:"100vh"}}>
    <aside className="sidebar" style={{overflowY:"auto"}}>
      <div className="brand"><div className="brand-logo">R</div><div><h2>Sales Intelligence</h2><small>Raj Agencies · Live Dashboard</small></div></div>
      <nav>{nav.map(item=>{const Icon=item.icon;return <button key={item.id} type="button" className={page===item.id?"nav active":"nav"} onClick={()=>setPage(item.id)}><Icon size={19}/>{item.label}</button>})}</nav>
      <div style={{marginTop:24,paddingTop:16,borderTop:"1px solid #e9e2f5"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}><strong style={{display:"flex",alignItems:"center",gap:6}}><Filter size={16}/> Filters</strong><button type="button" onClick={reset} style={{border:0,background:"transparent",color:"#7048e8",cursor:"pointer",display:"flex",gap:4,alignItems:"center"}}><RotateCcw size={13}/> Clear all</button></div>
        {dimensions.map(d=><details key={d.key} style={{marginBottom:8,border:"1px solid #e8e2f4",borderRadius:9,padding:9,background:"#fff"}}><summary style={{cursor:"pointer",fontSize:13,fontWeight:650}}>{d.label} {filters[d.key].length>0?`(${filters[d.key].length})`:""}</summary><div style={{display:"flex",gap:8,marginTop:9,marginBottom:8}}>
          <button type="button" onClick={()=>selectAll(d.key)} style={{...buttonStyle,padding:"5px 8px",fontSize:11}}>Select All</button>
          <button type="button" onClick={()=>unselectAll(d.key)} style={{...buttonStyle,padding:"5px 8px",fontSize:11,background:"#eee8fa",color:"#6044ac"}}>Unselect All</button>
        </div><div style={{maxHeight:135,overflowY:"auto",marginTop:9}}>{[...new Set(sales.map(r=>r[d.key]).filter(Boolean))].sort().map(v=><label key={v} style={{display:"flex",alignItems:"center",gap:7,fontSize:12,marginBottom:7,cursor:"pointer"}}><input type="checkbox" checked={filters[d.key].includes(v)} onChange={()=>setSelection(d.key,v)}/>{d.key==="month"?monthLabel(v):v}</label>)}</div></details>)}
      </div>
    </aside>
    <main className="main" style={{minWidth:0}}>
      <header className="header"><div><h1>Sales Intelligence</h1><p>Raj Agencies · Company Sales Performance</p></div><div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}><span className="admin-badge">{session.user.email}</span><button type="button" onClick={logout} style={{...buttonStyle,padding:"8px 12px"}}>Logout</button></div></header>
      {loading && <div style={{marginBottom:16,padding:12,background:"#edf4ff",borderRadius:10}}>Supabase માંથી Sales Data લોડ થઈ રહ્યો છે...</div>}
       {dataError && <div role="alert" style={{marginBottom:16,padding:12,background:"#fff0ee",color:"#a4262c",borderRadius:10}}>Database error: {dataError}</div>}
       {!loading && !dataError && sales.length===0 && <div style={{marginBottom:16,padding:12,background:"#fff6df",borderRadius:10}}>Supabase માં હજી Sales Records નથી. Excel Preview થી Database માં Data Save થતો નથી.</div>}
       {!loading && !dataError && sales.length>0 && <div style={{marginBottom:16,padding:12,background:"#ecfdf3",borderRadius:10}}>Live Supabase Data: {formatNumber(sales.length)} sales records</div>}
      {page==="dashboard"&&<>
        <div className="kpi-grid"><Kpi title="Total Sales" value={formatMoney(sum(filtered,"amount"))} icon={<IndianRupee/>}/><Kpi title="Products Sold (Qty)" value={formatNumber(sum(filtered,"qty"))} icon={<Package/>}/><Kpi title="Customers Billed" value={formatNumber(unique(filtered,"customer"))} icon={<Users/>}/><Kpi title="Unique Part Numbers" value={formatNumber(unique(filtered,"code"))} icon={<TrendingUp/>}/></div>
        <section className="panel"><h2>Sales Comparison</h2><p>Select multiple months for each group. Sidebar filters apply to both.</p><div className="comparison-grid"><MonthPicker title="Compare Months" months={months} selected={compare} onChange={setCompare}/><MonthPicker title="Actual Months" months={months} selected={actual} onChange={setActual}/></div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:12,marginTop:16}}><MiniStat label="Compare Sales" value={formatMoney(compareSales)}/><MiniStat label="Actual Sales" value={formatMoney(actualSales)}/><MiniStat label="Difference" value={(difference>=0?"+":"")+formatMoney(difference)}/><MiniStat label="Growth" value={compareSales===0?"N/A":`${(difference/compareSales*100).toFixed(1)}%`}/><MiniStat label="Compare Monthly Avg" value={formatMoney(compare.length?compareSales/compare.length:0)}/><MiniStat label="Actual Monthly Avg" value={formatMoney(actual.length?actualSales/actual.length:0)}/></div></section>
        <section className="panel"><h2>Month-wise Summary</h2><p>Sales-related columns are calculated from Supabase records. Budget, target and payment data are not uploaded yet.</p><div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:12,whiteSpace:"nowrap"}}><thead><tr>{["Month","Total Qty","Total Sales","Part Numbers","Customers Billed","Avg Sales / Customer","Total Budget","Target Customers","Target Budget","Zero Sales Customers","Zero Sales Budget","Payment Received","List Value"].map(h=><th key={h} style={{padding:12,textAlign:"left",borderBottom:"2px solid #eee8fa",color:"#7048e8"}}>{h}</th>)}</tr></thead><tbody>{months.map(m=>{const rows=filtered.filter(r=>r.month===m);const customers=unique(rows,"customer");return <tr key={m}>{[monthLabel(m),formatNumber(sum(rows,"qty")),formatMoney(sum(rows,"amount")),formatNumber(unique(rows,"code")),formatNumber(customers),formatMoney(customers?sum(rows,"amount")/customers:0),"Not uploaded","Not uploaded","Not uploaded","Not available","Not available","Not uploaded",formatMoney(sum(rows,"listValue"))].map((v,i)=><td key={i} style={{padding:12,borderBottom:"1px solid #f0edf6"}}>{v}</td>)}</tr>})}</tbody></table></div></section>
        <section className="panel"><h2>Visual Analysis</h2><p>Monthly Sales vs List Value (Live)</p><div style={{width:"100%",height:300}}><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="name"/><YAxis tickFormatter={v=>`${Math.round(Number(v)/1000)}k`}/><Tooltip formatter={v=>formatMoney(Number(v))}/><Legend/><Bar dataKey="Sales" fill="#7048e8" radius={[5,5,0,0]}/><Bar dataKey="List Value" fill="#b6a2f5" radius={[5,5,0,0]}/></BarChart></ResponsiveContainer></div></section>
        <section className="panel"><h2>Analysis View</h2><p>Choose a category to see the detailed report.</p><div className="analysis-grid">{(["customer","company","product","sm","area","city"] as const).map(key=><button key={key} type="button" className="analysis-item" onClick={()=>{setAnalysisKey(key);setPage("analysis")}} style={{cursor:"pointer",border:"1px solid #eee8fa",background:"#faf8ff"}}><BarChart3 size={19}/>{key.toUpperCase()} Wise</button>)}</div></section>
      </>}
      {page==="analysis"&&<section className="panel"><button type="button" onClick={()=>setPage("dashboard")} style={{...buttonStyle,marginBottom:14}}>← Back to Dashboard</button><h2>Sales Analysis</h2><p>All figures follow sidebar filters. Budget and target comparisons will be added when those files are available.</p><div style={{display:"flex",gap:8,flexWrap:"wrap",margin:"16px 0"}}>{(["customer","company","product","sm","area","city"] as const).map(key=><button key={key} type="button" onClick={()=>setAnalysisKey(key)} style={{...buttonStyle,background:analysisKey===key?"#7048e8":"#f0eafa",color:analysisKey===key?"white":"#6044ac"}}>{key.toUpperCase()} Wise</button>)}</div><div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}><thead><tr>{[analysisKey.toUpperCase(),...(analysisKey==="company"?["Product Group"]:[]),"Qty","Sales","List Value","Customers","Part Numbers"].map(h=><th key={h} style={{textAlign:"left",padding:12,borderBottom:"2px solid #eee8fa"}}>{h}</th>)}</tr></thead><tbody>{grouped.map(r=><tr key={`${r.name}-${r.productGroup}`}>{[r.name,...(analysisKey==="company"?[r.productGroup||"—"]:[]),formatNumber(r.qty),formatMoney(r.sales),formatMoney(r.listValue),r.customers,r.parts].map((v,i)=><td key={i} style={{padding:12,borderBottom:"1px solid #f0edf6"}}>{v}</td>)}</tr>)}{grouped.length===0&&<tr><td colSpan={analysisKey==="company"?7:6} style={{padding:20}}>No matching records.</td></tr>}</tbody></table></div></section>}
      {page==="upload"&&<><section className="panel"><h2>Sales Data Upload</h2><p>Download the standard sample Excel with Qty, Amt and List Value columns.</p><button type="button" onClick={downloadSalesTemplate} style={{...buttonStyle,display:"inline-flex",alignItems:"center",gap:8,marginTop:12}}><Download size={17}/> Download Sample Sales Excel</button></section><ExcelPreview onUploaded={()=>setRefreshKey(v=>v+1)}/><section className="panel"><h2>Database</h2><div className="analysis-grid"><div className="analysis-item"><Database size={20}/> Supabase Database (connected — read only)</div><div className="analysis-item"><FileSpreadsheet size={20}/> Original Excel Columns</div><div className="analysis-item"><Package size={20}/> List Value Supported</div></div></section></>}
      {page==="admin"&&<><section className="panel"><h2>Admin Panel</h2><p>Signed in: {session.user.email}</p><p>User management will be added after sales testing.</p></section><SalesDataManager email={session.user.email} onDeleted={()=>setRefreshKey(v=>v+1)}/></>}
    </main>
  </div>;
}
function Kpi({title,value,icon}:{title:string;value:string;icon:ReactNode}){return <div className="kpi-card"><div className="kpi-icon">{icon}</div><p>{title}</p><h2>{value}</h2></div>}
function MiniStat({label,value}:{label:string;value:string}){return <div style={cardStyle}><div style={{fontSize:12,color:"#777"}}>{label}</div><strong style={{fontSize:19,display:"block",marginTop:8}}>{value}</strong></div>}
function MonthPicker({title,months,selected,onChange}:{title:string;months:string[];selected:string[];onChange:(v:string[])=>void}){return <div style={{...cardStyle,background:"#faf8ff"}}><strong>{title}</strong><div style={{display:"flex",flexWrap:"wrap",gap:12,marginTop:12}}>{months.map(m=><label key={m} style={{display:"flex",alignItems:"center",gap:6,fontSize:13,cursor:"pointer"}}><input type="checkbox" checked={selected.includes(m)} onChange={()=>onChange(selected.includes(m)?selected.filter(x=>x!==m):[...selected,m])}/>{monthLabel(m)}</label>)}</div></div>}
