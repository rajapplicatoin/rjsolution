import { useEffect, useMemo, useState } from "react";

type Item = { name: string; productGroup: string; qty: number; sales: number; customers: number; parts: number };
type Column = "name" | "qty" | "sales" | "customers" | "parts";
type SortDirection = "asc" | "desc";
const money = (n: number) => "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
const number = (n: number) => n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
const labels: Record<string,string> = { customer:"Customer", company:"Product Group", product:"Product", sm:"SM", area:"Area", city:"City" };
const fields: {key:Column;label:string}[] = [
  {key:"name",label:"Name"},{key:"qty",label:"Qty"},{key:"sales",label:"Sales"},
  {key:"customers",label:"Customers"},{key:"parts",label:"Part Numbers"}
];
const inputStyle = {padding:"9px 11px",border:"1px solid #d9d2e9",borderRadius:8,width:"100%",boxSizing:"border-box" as const};
const buttonStyle = {padding:"9px 12px",border:"1px solid #ddd5ee",borderRadius:8,background:"#f0eafa",color:"#6044ac",cursor:"pointer"};
export default function AnalysisTable({rows,analysisKey}:{rows:Item[];analysisKey:string}) {
  const [search,setSearch] = useState("");
  const [columnSearch,setColumnSearch] = useState<Record<Column,string>>({name:"",qty:"",sales:"",customers:"",parts:""});
  const [sortBy,setSortBy] = useState<Column>("sales");
  const [direction,setDirection] = useState<SortDirection>("desc");
  const [minSales,setMinSales] = useState("");
  const [maxSales,setMaxSales] = useState("");
  useEffect(()=>{setSearch("");setColumnSearch({name:"",qty:"",sales:"",customers:"",parts:""});setSortBy("sales");setDirection("desc");setMinSales("");setMaxSales("");},[analysisKey]);
  const visible = useMemo(()=>rows.filter(r=>{
    const text = [r.name,r.qty,r.sales,r.customers,r.parts].join(" ").toLowerCase();
    if (search.trim() && !text.includes(search.trim().toLowerCase())) return false;
    if (minSales.trim() && Number.isFinite(Number(minSales)) && r.sales < Number(minSales)) return false;
    if (maxSales.trim() && Number.isFinite(Number(maxSales)) && r.sales > Number(maxSales)) return false;
    return fields.every(f=>{
      const q=columnSearch[f.key].trim().toLowerCase();
      if (!q) return true;
      const v=f.key==="name"?r.name:String(r[f.key]);
      return v.toLowerCase().includes(q);
    });
  }).sort((a,b)=>{
    const result=sortBy==="name"?a.name.localeCompare(b.name,undefined,{numeric:true,sensitivity:"base"}):a[sortBy]-b[sortBy];
    return direction==="asc"?result:-result;
  }),[rows,search,columnSearch,sortBy,direction,minSales,maxSales]);
  const sort=(key:Column)=>{if(sortBy===key)setDirection(d=>d==="asc"?"desc":"asc");else{setSortBy(key);setDirection(key==="name"?"asc":"desc");}};
  const reset=()=>{setSearch("");setColumnSearch({name:"",qty:"",sales:"",customers:"",parts:""});setMinSales("");setMaxSales("");setSortBy("sales");setDirection("desc");};
  return <div>
    <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"end",margin:"16px 0"}}>
      <label style={{flex:"1 1 250px",fontSize:13,fontWeight:600}}>{labels[analysisKey]||"All"} Wise Search
        <input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder={`Search ${labels[analysisKey]||"data"} or any column...`} style={{...inputStyle,display:"block",marginTop:6}} />
      </label>
      <label style={{flex:"1 1 140px",fontSize:13}}>Minimum Sales (₹)<input type="number" value={minSales} onChange={e=>setMinSales(e.target.value)} style={{...inputStyle,display:"block",marginTop:6}} /></label>
      <label style={{flex:"1 1 140px",fontSize:13}}>Maximum Sales (₹)<input type="number" value={maxSales} onChange={e=>setMaxSales(e.target.value)} style={{...inputStyle,display:"block",marginTop:6}} /></label>
      <button type="button" onClick={reset} style={buttonStyle}>Clear Search / Filters</button>
    </div>
    <div style={{fontSize:13,marginBottom:10,color:"#655b76"}}>Showing <strong>{number(visible.length)}</strong> of {number(rows.length)} groups. Column heading પર Click કરીને A–Z / Z–A અથવા Small–Large / Large–Small Sort કરો.</div>
    <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13,minWidth:760}}>
      <thead><tr>{fields.map(f=><th key={f.key} style={{textAlign:"left",padding:9,borderBottom:"2px solid #eee8fa",verticalAlign:"top"}}>
        <button type="button" onClick={()=>sort(f.key)} style={{border:0,background:"transparent",cursor:"pointer",fontWeight:700,padding:"4px 0",color:sortBy===f.key?"#7048e8":"#302153"}}>{f.key==="name"?labels[analysisKey]||"Name":f.label} {sortBy===f.key?(direction==="asc"?"▲":"▼"):"↕"}</button>
        <input type="search" aria-label={`Filter ${f.label}`} placeholder={`Filter ${f.key==="name"?labels[analysisKey]||"Name":f.label}`} value={columnSearch[f.key]} onChange={e=>setColumnSearch(s=>({...s,[f.key]:e.target.value}))} style={{...inputStyle,fontSize:12,marginTop:6}} />
      </th>)}</tr></thead>
      <tbody>{visible.map(r=><tr key={`${r.name}-${r.productGroup}`}>
        <td style={{padding:12,borderBottom:"1px solid #f0edf6"}}>{r.name||"(Blank)"}</td>
        <td style={{padding:12,borderBottom:"1px solid #f0edf6"}}>{number(r.qty)}</td>
        <td style={{padding:12,borderBottom:"1px solid #f0edf6"}}>{money(r.sales)}</td>
        <td style={{padding:12,borderBottom:"1px solid #f0edf6"}}>{number(r.customers)}</td>
        <td style={{padding:12,borderBottom:"1px solid #f0edf6"}}>{number(r.parts)}</td>
      </tr>)}{visible.length===0&&<tr><td colSpan={5} style={{padding:20}}>No matching records. Search અથવા Filter બદલો.</td></tr>}</tbody>
    </table></div>
  </div>;
}
