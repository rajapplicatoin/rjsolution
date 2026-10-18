import { useMemo, useState, type ReactNode } from "react";
import { LayoutDashboard, BarChart3, Upload, Settings, Package, Users, IndianRupee, Download, FileSpreadsheet, Database, TrendingUp, Filter, RotateCcw } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { downloadSalesTemplate } from "./salesTemplate";
import ExcelPreview from "./ExcelPreview";

type Page = "dashboard" | "analysis" | "upload" | "admin";
type Sale = { month: string; customer: string; company: string; product: string; group: string; code: string; sm: string; order: string; area: string; city: string; pin: string; qty: number; amount: number; listValue: number };
const demo: Sale[] = [
  { month:"2026-04", customer:"Shree Traders", company:"Alpha", product:"Bearing", group:"Mechanical", code:"BR-101", sm:"Ravi", order:"SO-101", area:"Varachha", city:"Surat", pin:"395006", qty:140, amount:175000, listValue:195000 },
  { month:"2026-04", customer:"Patel Industries", company:"Beta", product:"Motor", group:"Electrical", code:"MT-202", sm:"Amit", order:"SO-102", area:"Udhna", city:"Surat", pin:"394210", qty:32, amount:256000, listValue:280000 },
  { month:"2026-04", customer:"Om Enterprises", company:"Alpha", product:"Bearing", group:"Mechanical", code:"BR-101", sm:"Ravi", order:"SO-103", area:"Adajan", city:"Surat", pin:"395009", qty:90, amount:112500, listValue:130000 },
  { month:"2026-05", customer:"Shree Traders", company:"Alpha", product:"Bearing", group:"Mechanical", code:"BR-101", sm:"Ravi", order:"SO-201", area:"Varachha", city:"Surat", pin:"395006", qty:160, amount:200000, listValue:225000 },
  { month:"2026-05", customer:"Patel Industries", company:"Beta", product:"Motor", group:"Electrical", code:"MT-202", sm:"Amit", order:"SO-202", area:"Udhna", city:"Surat", pin:"394210", qty:44, amount:352000, listValue:390000 },
  { month:"2026-05", customer:"Krishna Sales", company:"Gamma", product:"Cable", group:"Electrical", code:"CB-303", sm:"Neha", order:"SO-203", area:"Ring Road", city:"Surat", pin:"395002", qty:260, amount:78000, listValue:95000 },
  { month:"2026-06", customer:"Shree Traders", company:"Alpha", product:"Bearing", group:"Mechanical", code:"BR-101", sm:"Ravi", order:"SO-301", area:"Varachha", city:"Surat", pin:"395006", qty:180, amount:225000, listValue:250000 },
  { month:"2026-06", customer:"Om Enterprises", company:"Gamma", product:"Cable", group:"Electrical", code:"CB-303", sm:"Neha", order:"SO-302", area:"Adajan", city:"Surat", pin:"395009", qty:310, amount:93000, listValue:115000 },
  { month:"2026-06", customer:"Krishna Sales", company:"Beta", product:"Motor", group:"Electrical", code:"MT-202", sm:"Amit", order:"SO-303", area:"Ring Road", city:"Surat", pin:"395002", qty:52, amount:416000, listValue:460000 },
];
const formatMoney = (v:number) => "₹" + v.toLocaleString("en-IN", { maximumFractionDigits: 0 });
const formatNumber = (v:number) => v.toLocaleString("en-IN", { maximumFractionDigits: 2 });
const monthLabel = (s:string) => new Date(s+"-01T00:00:00").toLocaleDateString("en-IN", {month:"long",year:"numeric"});
const sum = (rows:Sale[], key:"amount"|"qty"|"listValue") => rows.reduce((t,r)=>t+r[key],0);
const unique = (rows:Sale[], key:keyof Sale) => new Set(rows.map(r=>String(r[key]))).size;
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
  const [page,setPage] = useState<Page>("dashboard");
  const [filters,setFilters] = useState<Filters>(emptyFilters);
  const [compare,setCompare] = useState<string[]>(["2026-04"]);
  const [actual,setActual] = useState<string[]>(["2026-05","2026-06"]);
  const [analysisKey,setAnalysisKey] = useState<"customer"|"company"|"product"|"sm"|"area"|"city">("customer");
  const months = [...new Set(demo.map(x=>x.month))].sort();
  const filtered = useMemo(()=>demo.filter(r=>dimensions.every(d=>filters[d.key].length===0 || filters[d.key].includes(r[d.key]))),[filters]);
  const setSelection=(key:FilterKey,value:string)=>setFilters(old=>({...old,[key]:old[key].includes(value)?old[key].filter(v=>v!==value):[...old[key],value]}));
  const reset=()=>setFilters(emptyFilters());
  const chartData=months.map(month=>({name:monthLabel(month),Sales:sum(filtered.filter(r=>r.month===month),"amount"),"List Value":sum(filtered.filter(r=>r.month===month),"listValue")}));
  const grouped = [...new Set(filtered.map(r=>r[analysisKey]))].map(name=>{const rows=filtered.filter(r=>r[analysisKey]===name);return {name,qty:sum(rows,"qty"),sales:sum(rows,"amount"),listValue:sum(rows,"listValue"),customers:unique(rows,"customer"),parts:unique(rows,"code")}}).sort((a,b)=>b.sales-a.sales);
  const compareRows=filtered.filter(r=>compare.includes(r.month));
  const actualRows=filtered.filter(r=>actual.includes(r.month));
  const compareSales=sum(compareRows,"amount");
  const actualSales=sum(actualRows,"amount");
  const difference=actualSales-compareSales;
  const nav=[{id:"dashboard" as Page,label:"Sales Dashboard",icon:LayoutDashboard},{id:"analysis" as Page,label:"Sales Analysis",icon:BarChart3},{id:"upload" as Page,label:"Data Upload",icon:Upload},{id:"admin" as Page,label:"Admin Panel",icon:Settings}];
  return <div className="app" style={{minHeight:"100vh"}}>
    <aside className="sidebar" style={{overflowY:"auto"}}>
      <div className="brand"><div className="brand-logo">R</div><div><h2>Sales Intelligence</h2><small>Raj Agencies · Demo Preview</small></div></div>
      <nav>{nav.map(item=>{const Icon=item.icon;return <button key={item.id} type="button" className={page===item.id?"nav active":"nav"} onClick={()=>setPage(item.id)}><Icon size={19}/>{item.label}</button>})}</nav>
      <div style={{marginTop:24,paddingTop:16,borderTop:"1px solid #e9e2f5"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}><strong style={{display:"flex",alignItems:"center",gap:6}}><Filter size={16}/> Filters</strong><button type="button" onClick={reset} style={{border:0,background:"transparent",color:"#7048e8",cursor:"pointer",display:"flex",gap:4,alignItems:"center"}}><RotateCcw size={13}/> Clear all</button></div>
        {dimensions.map(d=><details key={d.key} style={{marginBottom:8,border:"1px solid #e8e2f4",borderRadius:9,padding:9,background:"#fff"}}><summary style={{cursor:"pointer",fontSize:13,fontWeight:650}}>{d.label} {filters[d.key].length>0?`(${filters[d.key].length})`:""}</summary><div style={{maxHeight:135,overflowY:"auto",marginTop:9}}>{[...new Set(demo.map(r=>r[d.key]))].sort().map(v=><label key={v} style={{display:"flex",alignItems:"center",gap:7,fontSize:12,marginBottom:7,cursor:"pointer"}}><input type="checkbox" checked={filters[d.key].includes(v)} onChange={()=>setSelection(d.key,v)}/>{d.key==="month"?monthLabel(v):v}</label>)}</div></details>)}
      </div>
    </aside>
    <main className="main" style={{minWidth:0}}>
      <header className="header"><div><h1>Sales Intelligence</h1><p>Raj Agencies · Company Sales Performance</p></div><span className="admin-badge">Demo Preview · Not Live Data</span></header>
      <div style={{marginBottom:16,padding:"11px 15px",borderRadius:10,background:"#fff6df",color:"#795700",fontSize:13}}>આ Dashboard માં બતાવેલો Data માત્ર Demo છે. Supabase માંથી વાસ્તવિક Sales Data હજી જોડાયેલો નથી.</div>
      {page==="dashboard"&&<>
        <div className="kpi-grid"><Kpi title="Total Sales" value={formatMoney(sum(filtered,"amount"))} icon={<IndianRupee/>}/><Kpi title="Products Sold (Qty)" value={formatNumber(sum(filtered,"qty"))} icon={<Package/>}/><Kpi title="Customers Billed" value={formatNumber(unique(filtered,"customer"))} icon={<Users/>}/><Kpi title="Unique Part Numbers" value={formatNumber(unique(filtered,"code"))} icon={<TrendingUp/>}/></div>
        <section className="panel"><h2>Sales Comparison</h2><p>Select multiple months for each group. Sidebar filters apply to both.</p><div className="comparison-grid"><MonthPicker title="Compare Months" months={months} selected={compare} onChange={setCompare}/><MonthPicker title="Actual Months" months={months} selected={actual} onChange={setActual}/></div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:12,marginTop:16}}><MiniStat label="Compare Sales" value={formatMoney(compareSales)}/><MiniStat label="Actual Sales" value={formatMoney(actualSales)}/><MiniStat label="Difference" value={(difference>=0?"+":"")+formatMoney(difference)}/><MiniStat label="Growth" value={compareSales===0?"N/A":`${(difference/compareSales*100).toFixed(1)}%`}/><MiniStat label="Compare Monthly Avg" value={formatMoney(compare.length?compareSales/compare.length:0)}/><MiniStat label="Actual Monthly Avg" value={formatMoney(actual.length?actualSales/actual.length:0)}/></div></section>
        <section className="panel"><h2>Month-wise Summary</h2><p>Sales-related columns are calculated from demo rows. Budget, target and payment data are not uploaded yet.</p><div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:12,whiteSpace:"nowrap"}}><thead><tr>{["Month","Total Qty","Total Sales","Part Numbers","Customers Billed","Avg Sales / Customer","Total Budget","Target Customers","Target Budget","Zero Sales Customers","Zero Sales Budget","Payment Received","List Value"].map(h=><th key={h} style={{padding:12,textAlign:"left",borderBottom:"2px solid #eee8fa",color:"#7048e8"}}>{h}</th>)}</tr></thead><tbody>{months.map(m=>{const rows=filtered.filter(r=>r.month===m);const customers=unique(rows,"customer");return <tr key={m}>{[monthLabel(m),formatNumber(sum(rows,"qty")),formatMoney(sum(rows,"amount")),formatNumber(unique(rows,"code")),formatNumber(customers),formatMoney(customers?sum(rows,"amount")/customers:0),"Not uploaded","Not uploaded","Not uploaded","Not available","Not available","Not uploaded",formatMoney(sum(rows,"listValue"))].map((v,i)=><td key={i} style={{padding:12,borderBottom:"1px solid #f0edf6"}}>{v}</td>)}</tr>})}</tbody></table></div></section>
        <section className="panel"><h2>Visual Analysis</h2><p>Monthly Sales vs List Value (Demo)</p><div style={{width:"100%",height:300}}><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="name"/><YAxis tickFormatter={v=>`${Math.round(Number(v)/1000)}k`}/><Tooltip formatter={v=>formatMoney(Number(v))}/><Legend/><Bar dataKey="Sales" fill="#7048e8" radius={[5,5,0,0]}/><Bar dataKey="List Value" fill="#b6a2f5" radius={[5,5,0,0]}/></BarChart></ResponsiveContainer></div></section>
        <section className="panel"><h2>Analysis View</h2><p>Choose a category to see the detailed report.</p><div className="analysis-grid">{(["customer","company","product","sm","area","city"] as const).map(key=><button key={key} type="button" className="analysis-item" onClick={()=>{setAnalysisKey(key);setPage("analysis")}} style={{cursor:"pointer",border:"1px solid #eee8fa",background:"#faf8ff"}}><BarChart3 size={19}/>{key.toUpperCase()} Wise</button>)}</div></section>
      </>}
      {page==="analysis"&&<section className="panel"><h2>Sales Analysis</h2><p>All figures follow sidebar filters. Budget and target comparisons will be added when those files are available.</p><div style={{display:"flex",gap:8,flexWrap:"wrap",margin:"16px 0"}}>{(["customer","company","product","sm","area","city"] as const).map(key=><button key={key} type="button" onClick={()=>setAnalysisKey(key)} style={{...buttonStyle,background:analysisKey===key?"#7048e8":"#f0eafa",color:analysisKey===key?"white":"#6044ac"}}>{key.toUpperCase()} Wise</button>)}</div><div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}><thead><tr>{[analysisKey.toUpperCase(),"Qty","Sales","List Value","Customers","Part Numbers"].map(h=><th key={h} style={{textAlign:"left",padding:12,borderBottom:"2px solid #eee8fa"}}>{h}</th>)}</tr></thead><tbody>{grouped.map(r=><tr key={r.name}>{[r.name,formatNumber(r.qty),formatMoney(r.sales),formatMoney(r.listValue),r.customers,r.parts].map((v,i)=><td key={i} style={{padding:12,borderBottom:"1px solid #f0edf6"}}>{v}</td>)}</tr>)}{grouped.length===0&&<tr><td colSpan={6} style={{padding:20}}>No matching records.</td></tr>}</tbody></table></div></section>}
      {page==="upload"&&<><section className="panel"><h2>Sales Data Upload</h2><p>Download the standard sample Excel with Qty, Amt and List Value columns.</p><button type="button" onClick={downloadSalesTemplate} style={{...buttonStyle,display:"inline-flex",alignItems:"center",gap:8,marginTop:12}}><Download size={17}/> Download Sample Sales Excel</button></section><ExcelPreview/><section className="panel"><h2>Database</h2><div className="analysis-grid"><div className="analysis-item"><Database size={20}/> Supabase Database (not connected)</div><div className="analysis-item"><FileSpreadsheet size={20}/> Original Excel Columns</div><div className="analysis-item"><Package size={20}/> List Value Supported</div></div></section></>}
      {page==="admin"&&<section className="panel"><h2>Admin Panel</h2><p>Login, user roles, access permissions and upload history will be built after the dashboard and Excel preview are ready.</p><div className="placeholder">Admin Settings Coming Later</div></section>}
    </main>
  </div>;
}
function Kpi({title,value,icon}:{title:string;value:string;icon:ReactNode}){return <div className="kpi-card"><div className="kpi-icon">{icon}</div><p>{title}</p><h2>{value}</h2></div>}
function MiniStat({label,value}:{label:string;value:string}){return <div style={cardStyle}><div style={{fontSize:12,color:"#777"}}>{label}</div><strong style={{fontSize:19,display:"block",marginTop:8}}>{value}</strong></div>}
function MonthPicker({title,months,selected,onChange}:{title:string;months:string[];selected:string[];onChange:(v:string[])=>void}){return <div style={{...cardStyle,background:"#faf8ff"}}><strong>{title}</strong><div style={{display:"flex",flexWrap:"wrap",gap:12,marginTop:12}}>{months.map(m=><label key={m} style={{display:"flex",alignItems:"center",gap:6,fontSize:13,cursor:"pointer"}}><input type="checkbox" checked={selected.includes(m)} onChange={()=>onChange(selected.includes(m)?selected.filter(x=>x!==m):[...selected,m])}/>{monthLabel(m)}</label>)}</div></div>}
