import { useState, type ChangeEvent } from "react";
import * as XLSX from "xlsx";
import { FileSpreadsheet, AlertTriangle, CheckCircle2 } from "lucide-react";

type Cell = string | number | boolean | null | undefined;
type ExcelRow = Record<string, Cell>;
type Parsed = { file: string; sheet: string; total: number; valid: number; invalid: number; qty: number; sales: number; listValue: number; headers: string[]; missing: string[]; preview: {row: number; date: string; party: string; product: string; qty: number; amount: number; listValue: number; errors: string[]}[]; errors: {row: number; message: string}[] };
const aliases: Record<string,string[]> = {
  date: ["Dosc Date", "Doc Date", "Sale Date", "Sales Date", "Date"],
  party: ["Party Name", "Customer Name", "Customer"],
  product: ["Product Code", "Item Code"],
  qty: ["Qty", "Quantity"],
  amount: ["Amt", "Sales Amount", "Amount"],
  listValue: ["List Value", "List value sales", "ListValue"]
};
const clean = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
const number = (value: Cell): number => {
  if (typeof value === "number") return value;
  if (value === null || value === undefined || String(value).trim() === "") return NaN;
  return Number(String(value).replace(/,/g, "").replace(/₹/g, "").trim());
};
const dateString = (value: Cell): string => {
  if (typeof value === "number") {
    const d = XLSX.SSF.parse_date_code(value);
    return d ? `${d.y}-${String(d.m).padStart(2,"0")}-${String(d.d).padStart(2,"0")}` : "";
  }
  if (!value) return "";
  const s = String(value).trim();
  const iso = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2,"0")}-${iso[3].padStart(2,"0")}`;
  const indian = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (indian) return `${indian[3]}-${indian[2].padStart(2,"0")}-${indian[1].padStart(2,"0")}`;
  return "";
};
const validDate = (s: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0,10) === s;
};
const fmt = (v:number) => v.toLocaleString("en-IN", {maximumFractionDigits:2});
const money = (v:number) => `₹${fmt(v)}`;
const panel = {background:"#fff",border:"1px solid #ebe8f5",borderRadius:16,padding:20,marginBottom:18} as const;

export default function ExcelPreview() {
  const [data,setData] = useState<Parsed | null>(null);
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState("");
  async function load(event:ChangeEvent<HTMLInputElement>) {
    const file=event.target.files?.[0];
    if (!file) return;
    setBusy(true);setMessage("");setData(null);
    try {
      const buffer=await file.arrayBuffer();
      const wb=XLSX.read(buffer,{type:"array",cellDates:false});
      const sheetName=wb.SheetNames[0];
      if (!sheetName) throw new Error("Excel માં કોઈ Sheet મળી નથી.");
      const ws=wb.Sheets[sheetName];
      const rows=XLSX.utils.sheet_to_json<ExcelRow>(ws,{defval:"",raw:true,blankrows:false});
      const headers=(XLSX.utils.sheet_to_json<Cell[]>(ws,{header:1,range:0,blankrows:false})[0]||[]).map(v=>String(v??"").trim());
      const lookup=Object.fromEntries(headers.map(h=>[clean(h),h]));
      const mapped=Object.fromEntries(Object.entries(aliases).map(([key,names])=>[key,names.map(n=>lookup[clean(n)]).find(Boolean)])) as Record<string,string|undefined>;
      const missing=Object.entries(mapped).filter(([,h])=>!h).map(([k])=>({date:"Date (Dosc Date)",party:"Party Name",product:"Product Code",qty:"Qty",amount:"Amt",listValue:"List Value / List value sales"} as Record<string,string>)[k]);
      let valid=0,invalid=0,qty=0,sales=0,listValue=0;
      const preview:Parsed["preview"]=[];
      const errors:Parsed["errors"]=[];
      if (missing.length===0) rows.forEach((row,index)=>{
        const date=dateString(row[mapped.date!]);
        const party=String(row[mapped.party!]??"").trim();
        const product=String(row[mapped.product!]??"").trim();
        const q=number(row[mapped.qty!]);
        const a=number(row[mapped.amount!]);
        const l=number(row[mapped.listValue!]);
        const issues:string[]=[];
        if (!validDate(date)) issues.push("Invalid Date");
        if (!party) issues.push("Party Name ખાલી છે");
        if (!product) issues.push("Product Code ખાલી છે");
        if (!Number.isFinite(q)) issues.push("Invalid Qty");
        if (!Number.isFinite(a)) issues.push("Invalid Amt");
        if (!Number.isFinite(l)) issues.push("Invalid List Value");
        if (issues.length) {invalid++;if(errors.length<30) errors.push({row:index+2,message:issues.join(", ")});}
        else {valid++;qty+=q;sales+=a;listValue+=l;}
        if (preview.length<20) preview.push({row:index+2,date,party,product,qty:q,amount:a,listValue:l,errors:issues});
      });
      setData({file:file.name,sheet:sheetName,total:rows.length,valid,invalid,qty,sales,listValue,headers,missing,preview,errors});
    } catch(e) {setMessage(e instanceof Error?e.message:"Excel File વાંચી શકાઈ નથી.");}
    finally {setBusy(false);event.target.value="";}
  }
  return <section style={panel}>
    <h2>Sales Excel Upload — Preview & Validation</h2>
    <p style={{color:"#68647a"}}>Original Excel સીધી પસંદ કરો. <strong>List value sales</strong> અને <strong>List Value</strong> બંને સ્વીકારવામાં આવશે. કોઈ Data Supabase માં મોકલાતો નથી.</p>
    <label style={{display:"inline-flex",gap:10,alignItems:"center",padding:"12px 16px",border:"1px dashed #7048e8",borderRadius:10,cursor:"pointer",background:"#f6f2ff",color:"#6040c6",fontWeight:700,marginTop:10}}><FileSpreadsheet size={20}/>{busy?"Excel વાંચી રહ્યા છીએ...":"Choose Excel File (.xlsx, .xls)"}<input type="file" accept=".xlsx,.xls" onChange={load} disabled={busy} style={{display:"none"}}/></label>
    {message&&<p role="alert" style={{color:"#c32938"}}>{message}</p>}
    {data&&<>
      <p style={{marginTop:18,fontSize:13}}><strong>File:</strong> {data.file} &nbsp; | &nbsp; <strong>Sheet:</strong> {data.sheet}</p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(145px,1fr))",gap:10,marginTop:14}}>{[["Total Rows",fmt(data.total)],["Valid Rows",fmt(data.valid)],["Invalid Rows",fmt(data.invalid)],["Total Qty",fmt(data.qty)],["Total Sales",money(data.sales)],["Total List Value",money(data.listValue)]].map(([name,value])=><div key={name} style={{padding:14,borderRadius:10,background:"#f7f4ff"}}><div style={{fontSize:12,color:"#666"}}>{name}</div><strong style={{fontSize:18}}>{value}</strong></div>)}</div>
      {data.missing.length>0?<p style={{color:"#ae3434",display:"flex",gap:7,alignItems:"center"}}><AlertTriangle size={18}/> Missing required columns: {data.missing.join(", ")}</p>:<p style={{color:"#23744b",display:"flex",gap:7,alignItems:"center"}}><CheckCircle2 size={18}/> બધા જરૂરી Columns મળી ગયા. {data.invalid?`${data.invalid} Rows માં ભૂલ છે.`:"Preview Validation સફળ."}</p>}
      <h3 style={{marginTop:20}}>First 20 Rows Preview</h3>
      <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:12,whiteSpace:"nowrap"}}><thead><tr>{["Excel Row","Date","Party Name","Product Code","Qty","Amt","List Value","Validation"].map(h=><th key={h} style={{padding:10,textAlign:"left",borderBottom:"2px solid #e9e3f6"}}>{h}</th>)}</tr></thead><tbody>{data.preview.map(r=><tr key={r.row}>{[r.row,r.date,r.party,r.product,Number.isFinite(r.qty)?fmt(r.qty):"—",Number.isFinite(r.amount)?money(r.amount):"—",Number.isFinite(r.listValue)?money(r.listValue):"—",r.errors.length?r.errors.join("; "):"OK"].map((v,i)=><td key={i} style={{padding:10,borderBottom:"1px solid #f0edf7",color:i===7&&r.errors.length?"#b52b39":undefined}}>{v}</td>)}</tr>)}</tbody></table></div>
      {data.errors.length>0&&<><h3 style={{marginTop:18}}>Validation Errors (First 30)</h3>{data.errors.map(e=><p key={e.row} style={{fontSize:12,color:"#b52b39",margin:"4px 0"}}>Row {e.row}: {e.message}</p>)}</>}
      <p style={{fontSize:12,color:"#736d83",marginTop:18}}>આ Step માત્ર Browser Preview છે. Valid Totals માં માત્ર Validation Pass થયેલી Rows ગણાય છે. Negative Qty/Amt માન્ય છે. Duplicate Check અને Supabase Save પછી જોડાશે.</p>
    </>}
  </section>;
}
