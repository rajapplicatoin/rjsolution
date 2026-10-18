
import * as XLSX from "xlsx";

export const salesColumns = [
  "Sale Date",
  "Customer Name",
  "Product Code",
  "Product Name",
  "Product Group",
  "Company Name",
  "SM Name",
  "Order No",
  "Area",
  "City",
  "Pin Code",
  "Qty",
  "Amt",
  "List Value"
] as const;

export function downloadSalesTemplate() {
  const sample = {
    "Sale Date": "2026-04-01",
    "Customer Name": "Sample Customer",
    "Product Code": "PART-001",
    "Product Name": "Sample Product",
    "Product Group": "Sample Group",
    "Company Name": "Sample Company",
    "SM Name": "Sample SM",
    "Order No": "ORD-001",
    "Area": "Sample Area",
    "City": "Surat",
    "Pin Code": "395001",
    "Qty": 10,
    "Amt": 12500,
    "List Value": 15000
  };

  const worksheet = XLSX.utils.json_to_sheet(
    [sample],
    { header: [...salesColumns] }
  );

  worksheet["!cols"] = salesColumns.map((column) => ({
    wch: Math.max(column.length + 4, 18)
  }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    "Sales Upload"
  );

  XLSX.writeFile(
    workbook,
    "Sales_Upload_Template.xlsx"
  );
}
