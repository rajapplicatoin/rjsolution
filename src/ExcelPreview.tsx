import { useState, type ChangeEvent } from "react";
import * as XLSX from "xlsx";
import { FileSpreadsheet, AlertTriangle, CheckCircle2, UploadCloud } from "lucide-react";
import { supabase } from "./supabase";

type Cell = string | number | boolean | null | undefined;
type ExcelRow = Record<string, Cell>;
type UploadRow = Record<string, unknown>;
type PreviewRow = { row: number; date: string; party: string; code: string; qty: string; amount: string; warnings: string[] };
type Parsed = { file: string; sheet: string; total: number; qty: number; sales: number; headers: string[]; warnings: {row:number;message:string}[]; preview: PreviewRow[]; records: UploadRow[]; hash: string };

const aliases: Record<string, string[]> = {
  date: ["Dosc Date", "Doc Date", "Sale Date", "Sales Date", "Date"],
  party: ["Party Name", "Customer Name", "Customer"],
  code: ["Product Code", "Item Code", "Part Number"],
  product: ["Product Name", "Item Name", "Product Description", "Description"],
  group: ["Product Group", "Item Group", "Group"],
  company: ["Company Name", "Company", "Brand"],
  sm: ["SM Name", "SM", "Salesman", "Sales Person", "Sales Manager"],
  order: ["Order No", "Order Number", "Order", "Order No."],
  area: ["Area", "Area Name"],
  city: ["City", "City Name"],
  pin: ["Pin Code", "Pincode", "PIN", "Postal Code", "Zip Code"],
  qty: ["Qty", "Quantity"],
  amount: ["Taxable", "Taxable Amount", "Taxable Value"],
  
};
const clean = (s:string) => s.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
const txt = (v:Cell) => v == null ? "" : String(v).trim();
const numeric = (v:Cell): number | null => {
  if (txt(v) === "") return null;
  const n = Number(txt(v).replace(/[,₹\s]/g, ""));
  return Number.isFinite(n) ? n : null;
};
const dateValue = (v:Cell): string | null => {
  if (typeof v === "number") {
    const d = XLSX.SSF.parse_date_code(v);
    if (!d) return null;
    return validDate(`${d.y}-${String(d.m).padStart(2,"0")}-${String(d.d).padStart(2,"0")}`);
  }
  const s = txt(v);
  if (!s) return null;
  const iso = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  const indian = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (iso) return validDate(`${iso[1]}-${iso[2].padStart(2,"0")}-${iso[3].padStart(2,"0")}`);
  if (indian) return validDate(`${indian[3]}-${indian[2].padStart(2,"0")}-${indian[1].padStart(2,"0")}`);
  return null;
};
const validDate = (s:string):string|null => {
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0,10) === s ? s : null;
};
const fmt = (n:number) => n.toLocaleString("en-IN",{maximumFractionDigits:2});
const panel = {background:"#fff",border:"1px solid #ebe8f5",borderRadius:16,padding:20,marginBottom:18} as const;

export default function ExcelPreview({onUploaded}:{onUploaded?:()=>void}) {
  const [data,setData] = useState<Parsed|null>(null);
  const [busy,setBusy] = useState(false);
  const [saving,setSaving] = useState(false);
  const [message,setMessage] = useState("");
  const [success,setSuccess] = useState("");
  async function load(event:ChangeEvent<HTMLInputElement>) {
    const file=event.target.files?.[0];
    event.target.value="";
    if (!file) return;
    setBusy(true);setData(null);setMessage("");setSuccess("");
    try {
      const buffer=await file.arrayBuffer();
      const digest=await crypto.subtle.digest("SHA-256",buffer);
      const hash=Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,"0")).join("");
      const wb=XLSX.read(buffer,{type:"array",cellDates:false});
      const sheet=wb.SheetNames[0];
      if (!sheet) throw new Error("Excel માં Sheet મળી નથી.");
      const ws=wb.Sheets[sheet];
      const rows=XLSX.utils.sheet_to_json<ExcelRow>(ws,{defval:"",raw:true,blankrows:false});
      const headers=(XLSX.utils.sheet_to_json<Cell[]>(ws,{header:1,range:0,blankrows:false})[0]||[]).map(v=>txt(v));
      const lookup=new Map(headers.map(h=>[clean(h),h]));
      const col:Record<string,string|undefined>={};
      for (const [key,names] of Object.entries(aliases)) col[key]=names.map(n=>lookup.get(clean(n))).find(Boolean);
      const value=(r:ExcelRow,key:string):Cell => col[key] ? r[col[key]!] : "";
      const records:UploadRow[]=[];
      const preview:PreviewRow[]=[];
      const warnings:{row:number;message:string}[]=[];
      let qty=0,sales=0;
      rows.forEach((r,i)=>{
        const date=dateValue(value(r,"date"));
        const q=numeric(value(r,"qty"));
        const a=numeric(value(r,"amount"));
        const problems:string[]=[];
        if (txt(value(r,"date")) && !date) problems.push("Date વાંચી શકાઈ નથી");
        for (const [key,label] of [["qty","Qty"],["amount","Taxable"]]) {
          if (txt(value(r,key)) && numeric(value(r,key))===null) problems.push(`${label} નંબર નથી`);
        }
        if (problems.length) warnings.push({row:i+2,message:problems.join(", ")});
        const original:Record<string,Cell>={};
        for (const [key,val] of Object.entries(r)) original[key]=val;
        records.push({
          sale_date:date, sale_month:date?`${date.slice(0,7)}-01`:null,
          customer_name:txt(value(r,"party")), product_code:txt(value(r,"code")),
          product_name:txt(value(r,"product")), product_group:txt(value(r,"group")),
          company_name:txt(value(r,"company")), sm_name:txt(value(r,"sm")),
          order_no:txt(value(r,"order")), area:txt(value(r,"area")),
          city:txt(value(r,"city")), pin_code:txt(value(r,"pin")),
          quantity:q, sales_amount:a,
          original_data:{...original,__excel_row:i+2}
        });
        qty+=q??0;sales+=a??0;
        if (preview.length<20) preview.push({row:i+2,date:date??txt(value(r,"date")),party:txt(value(r,"party")),code:txt(value(r,"code")),qty:txt(value(r,"qty")),amount:txt(value(r,"amount")),warnings:problems});
      });
      setData({file:file.name,sheet,total:rows.length,qty,sales,headers,warnings,preview,records,hash});
    } catch(e) {setMessage(e instanceof Error?e.message:"Excel વાંચવામાં Error આવ્યો.");}
    finally {setBusy(false);}
  }
  async function save() {
    if (!data || !supabase || saving) return;
    if (!data.total) {setMessage("Excel માં Data Rows નથી.");return;}
    if (!window.confirm(`${data.total} Rows Supabase માં Save કરવી છે? ખાલી Optional Columns હોવા છતાં બધી Rows Save થશે.`)) return;
    setSaving(true);setMessage("");setSuccess("");
    try {
      const {data:result,error}=await supabase.rpc("upload_sales_excel",{
        p_file_name:data.file,p_file_hash:data.hash,p_rows:data.records
      });
      if (error) throw error;
      setSuccess(`${result?.inserted_rows ?? data.total} Rows સફળતાપૂર્વક Save થઈ. કોઈ Row Skip થઈ નથી.`);
      setData(null);
      onUploaded?.();
    } catch(e) {setMessage(e instanceof Error?e.message:"Upload નિષ્ફળ થયું.");}
    finally {setSaving(false);}
  }
  return <section style={panel}>
    <h2>Sales Excel Upload — All Rows Preserved</h2>
    <p>City, Pincode, Order, Area અથવા બીજા Optional Columns ખાલી હોય તો પણ Row Save થશે. Excel ના બધા Original Columns પણ સાચવાશે.</p>
    <label style={{display:"inline-flex",alignItems:"center",gap:8,padding:12,border:"1px dashed #7048e8",borderRadius:9,cursor:"pointer"}}><FileSpreadsheet size={20}/>{busy?"Reading Excel...":"Choose Excel File (.xlsx, .xls)"}<input type="file" accept=".xlsx,.xls" disabled={busy||saving} onChange={load} style={{display:"none"}}/></label>
    {message&&<p role="alert" style={{color:"#b42318"}}>{message}</p>}
    {success&&<p role="status" style={{color:"#177245"}}><CheckCircle2 size={17}/> {success}</p>}
    {data&&<>
      <p><strong>File:</strong> {data.file} | <strong>Sheet:</strong> {data.sheet}</p>
      <div style={{display:"flex",flexWrap:"wrap",gap:14}}><strong>Rows: {fmt(data.total)}</strong><strong>Qty: {fmt(data.qty)}</strong><strong>Taxable Sales: ₹{fmt(data.sales)}</strong></div>
      <p style={{color:"#666",fontSize:13}}>Excel Columns: {data.headers.join(" | ")}</p>
      {data.warnings.length>0&&<div style={{background:"#fff7e6",padding:12,borderRadius:9}}><p><AlertTriangle size={16}/> {data.warnings.length} Rows માં Date/Number વાંચવાની ચેતવણી છે. Rows Skip નહીં થાય; મૂળ Values original_data માં રહેશે. પરંતુ વાંચી ન શકાય તેવા Taxable/Qty Dashboard ના Total માં ગણાશે નહીં. Upload પહેલાં Excel સુધારવું વધુ સારું.</p>{data.warnings.slice(0,20).map(w=><p key={w.row} style={{fontSize:12}}>Row {w.row}: {w.message}</p>)}</div>}
      <h3>First 20 Rows Preview</h3>
      <div style={{overflowX:"auto"}}><table style={{borderCollapse:"collapse",width:"100%",fontSize:12}}><thead><tr>{["Row","Date","Party","Product Code","Qty","Taxable","Warnings"].map(h=><th key={h} style={{padding:8,textAlign:"left",borderBottom:"1px solid #ddd"}}>{h}</th>)}</tr></thead><tbody>{data.preview.map(r=><tr key={r.row}>{[r.row,r.date,r.party,r.code,r.qty,r.amount,r.warnings.join(", ")||"OK"].map((v,i)=><td key={i} style={{padding:8,borderBottom:"1px solid #eee"}}>{v}</td>)}</tr>)}</tbody></table></div>
      <button type="button" onClick={save} disabled={saving||busy||!data.total} style={{marginTop:18,display:"inline-flex",gap:8,alignItems:"center",padding:"12px 18px",border:0,borderRadius:9,background:"#7048e8",color:"white",fontWeight:700,cursor:"pointer"}}><UploadCloud size={18}/>{saving?"Saving all rows...":`Save All ${fmt(data.total)} Rows to Supabase`}</button>
    </>}
  </section>;
}
