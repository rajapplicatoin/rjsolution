
import { useState } from "react";
import {
  LayoutDashboard,
  BarChart3,
  Upload,
  Settings,
  Menu,
  Package,
  Users,
  IndianRupee
} from "lucide-react";

export default function App() {
  const [page, setPage] = useState("dashboard");

  const menus = [
    { id: "dashboard", name: "Sales Dashboard", icon: LayoutDashboard },
    { id: "analysis", name: "Sales Analysis", icon: BarChart3 },
    { id: "upload", name: "Data Upload", icon: Upload },
    { id: "admin", name: "Admin Panel", icon: Settings }
  ];

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
                key={item.id}
                className={page === item.id ? "nav active" : "nav"}
                onClick={() => setPage(item.id)}
              >
                <Icon size={19} />
                {item.name}
              </button>
            );
          })}
        </nav>
      </aside>

      <main className="main">
        <header className="header">
          <div>
            <h1>Sales Intelligence</h1>
            <p>Company Sales Performance Dashboard</p>
          </div>
          <span className="admin-badge">Admin</span>
        </header>

        {page === "dashboard" ? (
          <>
            <div className="kpi-grid">
              <Kpi title="Total Sales" value="—" icon={<IndianRupee />} />
              <Kpi title="Products Sold" value="—" icon={<Package />} />
              <Kpi title="Customers Billed" value="—" icon={<Users />} />
            </div>

            <section className="panel">
              <h2>Sales Comparison</h2>
              <p>Compare Months vs Actual Months</p>
              <div className="comparison-grid">
                <div className="placeholder">Compare Months</div>
                <div className="placeholder">Actual Months</div>
              </div>
            </section>

            <section className="panel">
              <h2>Month-wise Summary</h2>
              <p>
                Supabase માં Sales Data Upload થયા પછી
                અહીં Month-wise Summary દેખાશે.
              </p>
            </section>

            <section className="panel">
              <h2>Analysis View</h2>
              <div className="analysis-grid">
                {[
                  "Customer Wise",
                  "Company Wise",
                  "Product Wise",
                  "SM Wise",
                  "Area Wise",
                  "City Wise"
                ].map((name) => (
                  <div className="analysis-item" key={name}>
                    <BarChart3 size={20} />
                    <span>{name}</span>
                  </div>
                ))}
              </div>
            </section>
          </>
        ) : (
          <section className="panel">
            <h2>{menus.find((m) => m.id === page)?.name}</h2>
            <p>આ Module આગળના Step માં બનાવવામાં આવશે.</p>
          </section>
        )}
      </main>
    </div>
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
      <div className="kpi-icon">{icon}</div>
      <p>{title}</p>
      <h2>{value}</h2>
    </div>
  );
}
