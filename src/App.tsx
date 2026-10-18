
import { useState } from "react";
import {
  LayoutDashboard,
  BarChart3,
  Upload,
  Settings,
  Package,
  Users,
  IndianRupee,
  Download,
  FileSpreadsheet,
  Database,
  CheckCircle2
} from "lucide-react";
import { downloadSalesTemplate } from "./salesTemplate";

type Page = "dashboard" | "analysis" | "upload" | "admin";

const menus = [
  {
    id: "dashboard" as Page,
    name: "Sales Dashboard",
    icon: LayoutDashboard
  },
  {
    id: "analysis" as Page,
    name: "Sales Analysis",
    icon: BarChart3
  },
  {
    id: "upload" as Page,
    name: "Data Upload",
    icon: Upload
  },
  {
    id: "admin" as Page,
    name: "Admin Panel",
    icon: Settings
  }
];

const analysisTypes = [
  "Customer Wise",
  "Company Wise",
  "Product Wise",
  "SM Wise",
  "Area Wise",
  "City Wise"
];

export default function App() {
  const [page, setPage] = useState<Page>("dashboard");

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-logo">R</div>

          <div>
            <h2>Sales Intelligence</h2>
            <small>Raj Solution</small>
          </div>
        </div>

        <nav>
          {menus.map((item) => {
            const Icon = item.icon;

            return (
              <button
                type="button"
                key={item.id}
                className={
                  page === item.id
                    ? "nav active"
                    : "nav"
                }
                onClick={() => setPage(item.id)}
              >
                <Icon size={19} />
                {item.name}
              </button>
            );
          })}
        </nav>

        <div
          style={{
            marginTop: 35,
            padding: 15,
            borderRadius: 12,
            background: "#f4f0ff",
            color: "#7048e8",
            fontSize: 12
          }}
        >
          <strong>Sales Intelligence</strong>
          <p>
            Sales Dashboard, Analysis,
            Excel Upload & Reports
          </p>
        </div>
      </aside>

      <main className="main">
        <header className="header">
          <div>
            <h1>Sales Intelligence</h1>
            <p>
              Company Sales Performance Dashboard
            </p>
          </div>

          <span className="admin-badge">
            Admin Preview
          </span>
        </header>

        {page === "dashboard" && (
          <Dashboard />
        )}

        {page === "analysis" && (
          <Analysis />
        )}

        {page === "upload" && (
          <UploadPage />
        )}

        {page === "admin" && (
          <AdminPage />
        )}
      </main>
    </div>
  );
}

function Dashboard() {
  return (
    <>
      <div className="kpi-grid">
        <Kpi
          title="Total Sales"
          value="—"
          icon={<IndianRupee />}
        />

        <Kpi
          title="Products Sold"
          value="—"
          icon={<Package />}
        />

        <Kpi
          title="Customers Billed"
          value="—"
          icon={<Users />}
        />
      </div>

      <section className="panel">
        <h2>Sales Comparison</h2>

        <p>
          Compare Months vs Actual Months
        </p>

        <div className="comparison-grid">
          <div className="placeholder">
            Compare Months
            <p>Multiple month selection</p>
          </div>

          <div className="placeholder">
            Actual Months
            <p>Multiple month selection</p>
          </div>
        </div>

        <p>
          Sales Difference, Growth Percentage
          and Monthly Average will appear
          after data integration.
        </p>
      </section>

      <section className="panel">
        <h2>Month-wise Summary</h2>

        <p>
          April 2026, May 2026 and other months
          will appear automatically after
          Sales Data Upload.
        </p>

        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              marginTop: 20,
              textAlign: "left",
              fontSize: 13
            }}
          >
            <thead>
              <tr>
                {[
                  "Month",
                  "Total Qty",
                  "Total Sales",
                  "Products Sold",
                  "Customers Billed",
                  "Average Sales",
                  "Total Budget",
                  "Target Customers",
                  "Target Budget",
                  "Zero Sales Customers",
                  "Zero Sales Budget",
                  "Payment Received"
                ].map((column) => (
                  <th
                    key={column}
                    style={{
                      padding: 12,
                      whiteSpace: "nowrap",
                      borderBottom:
                        "1px solid #eceaf5",
                      color: "#7048e8"
                    }}
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              <tr>
                <td
                  colSpan={12}
                  style={{
                    padding: 25,
                    textAlign: "center",
                    color: "#88869b"
                  }}
                >
                  No sales data uploaded yet
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <h2>Analysis View</h2>
        <p>Month-wise detailed sales analysis</p>

        <div className="analysis-grid">
          {analysisTypes.map((name) => (
            <div
              className="analysis-item"
              key={name}
            >
              <BarChart3 size={20} />
              <span>{name}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>Visual Analysis</h2>

        <p>
          Sales Trends, Target vs Actual
          and Comparison Graphs will
          appear here.
        </p>

        <div className="placeholder">
          Chart Area
        </div>
      </section>
    </>
  );
}

function Analysis() {
  return (
    <section className="panel">
      <h2>Sales Analysis</h2>

      <p>
        Select an analysis category
        to view month-wise sales reports.
      </p>

      <div className="analysis-grid">
        {analysisTypes.map((name) => (
          <div
            key={name}
            className="analysis-item"
          >
            <BarChart3 size={20} />
            <span>{name}</span>
          </div>
        ))}
      </div>

      <p>
        Detailed reports will be activated
        after Supabase data integration.
      </p>
    </section>
  );
}

function UploadPage() {
  return (
    <>
      <section className="panel">
        <h2>Sales Data Upload</h2>

        <p>
          Download the standard Sales Excel
          Template to ensure all columns
          have the correct names and format.
        </p>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 15,
            flexWrap: "wrap",
            marginTop: 25
          }}
        >
          <FileSpreadsheet
            size={38}
            color="#7048e8"
          />

          <div>
            <strong>
              Sales Upload Template
            </strong>

            <p>
              Includes Qty, Amt and List Value
            </p>
          </div>

          <button
            type="button"
            onClick={downloadSalesTemplate}
            style={{
              background: "#7048e8",
              color: "#ffffff",
              border: "none",
              borderRadius: 10,
              padding: "13px 20px",
              fontWeight: 700
            }}
          >
            <Download
              size={17}
              style={{
                verticalAlign: "middle",
                marginRight: 8
              }}
            />
            Download Sample Excel
          </button>
        </div>
      </section>

      <section className="panel">
        <h2>Upload Sales Excel</h2>

        <p>
          Excel Upload, Column Validation,
          Duplicate Prevention and Supabase
          Storage will be connected next.
        </p>

        <div className="placeholder">
          <Upload size={25} />
          <p>
            Excel Upload Coming Next
          </p>
        </div>
      </section>

      <section className="panel">
        <h2>Data Storage</h2>

        <p>
          Sales records will be stored
          securely in Supabase.
        </p>

        <div className="analysis-grid">
          <div className="analysis-item">
            <Database size={20} />
            <span>Supabase Database</span>
          </div>

          <div className="analysis-item">
            <FileSpreadsheet size={20} />
            <span>Original Excel Data</span>
          </div>

          <div className="analysis-item">
            <CheckCircle2 size={20} />
            <span>List Value Column</span>
          </div>
        </div>
      </section>
    </>
  );
}

function AdminPage() {
  return (
    <section className="panel">
      <h2>Admin Panel</h2>

      <p>
        User Login, Permissions,
        Customer Access, SM Access,
        Company Access and Upload History
        will be managed here.
      </p>

      <div className="placeholder">
        Admin Settings Coming Next
      </div>
    </section>
  );
}

function Kpi({
  title,
  value,
  icon
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="kpi-card">
      <div className="kpi-icon">
        {icon}
      </div>

      <p>{title}</p>
      <h2>{value}</h2>
    </div>
  );
}
