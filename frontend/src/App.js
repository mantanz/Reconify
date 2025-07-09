import React, { useState } from "react";
import AddPanel from "./AddPanel";
import ModifyPanel from "./ModifyPanel";
import DeletePanel from "./DeletePanel";
import SOTUpload from "./SOTUpload";
import Reconciliation from "./Reconciliation";

const NAV_ITEMS = [
  { key: "add", label: "Add Panel", component: <AddPanel /> },
  { key: "modify", label: "Modify Panel", component: <ModifyPanel /> },
  { key: "delete", label: "Delete Panel", component: <DeletePanel /> },
];

function App() {
  const [selected, setSelected] = useState("add");
  const [showDropdown, setShowDropdown] = useState(false);
  const [showSOT, setShowSOT] = useState(false);
  const [showRecon, setShowRecon] = useState(false);

  return (
    <div style={{ fontFamily: "Segoe UI, Arial, sans-serif", background: "#f8f9fa", minHeight: "100vh" }}>
      <nav style={{ background: "#343a40", color: "#fff", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontWeight: 700, fontSize: 22 }}>Reconify Config</div>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div
            style={{ position: "relative" }}
            onMouseEnter={() => setShowDropdown(true)}
            onMouseLeave={() => setShowDropdown(false)}
          >
            <button
              style={{ background: "#495057", color: "#fff", border: "none", padding: "8px 18px", borderRadius: 4, cursor: "pointer", fontSize: 16 }}
              onClick={() => setShowDropdown((v) => !v)}
            >
              Config ▼
            </button>
            {showDropdown && (
              <div style={{ position: "absolute", right: 0, top: 38, background: "#fff", color: "#343a40", border: "1px solid #dee2e6", borderRadius: 4, boxShadow: "0 2px 8px rgba(0,0,0,0.08)", minWidth: 160, zIndex: 10 }}>
                {NAV_ITEMS.map(item => (
                  <div
                    key={item.key}
                    onClick={() => { setSelected(item.key); setShowDropdown(false); setShowSOT(false); setShowRecon(false); }}
                    style={{
                      padding: "10px 18px",
                      cursor: "pointer",
                      background: selected === item.key && !showSOT && !showRecon ? "#e9ecef" : "#fff",
                      fontWeight: selected === item.key && !showSOT && !showRecon ? 600 : 400,
                      borderBottom: "1px solid #f1f3f5",
                      transition: "background 0.2s"
                    }}
                  >
                    {item.label}
                  </div>
                ))}
              </div>
            )}
          </div>
          <button
            style={{ background: showSOT ? "#007bff" : "#495057", color: "#fff", border: "none", padding: "8px 18px", borderRadius: 4, cursor: "pointer", fontSize: 16, fontWeight: showSOT ? 600 : 400 }}
            onClick={() => { setShowSOT(true); setShowDropdown(false); setShowRecon(false); }}
          >
            SOT Upload
          </button>
          <button
            style={{ background: showRecon ? "#007bff" : "#495057", color: "#fff", border: "none", padding: "8px 18px", borderRadius: 4, cursor: "pointer", fontSize: 16, fontWeight: showRecon ? 600 : 400 }}
            onClick={() => { setShowRecon(true); setShowDropdown(false); setShowSOT(false); }}
          >
            Reconciliation
          </button>
        </div>
      </nav>
      {!showSOT && !showRecon ? (
        <div style={{ maxWidth: 500, margin: "40px auto", background: "#fff", borderRadius: 8, boxShadow: "0 2px 12px rgba(0,0,0,0.07)", padding: 32 }}>
          <h2 style={{ textAlign: "center", color: "#343a40", marginBottom: 32 }}>{NAV_ITEMS.find(i => i.key === selected).label}</h2>
          {NAV_ITEMS.find(i => i.key === selected).component}
        </div>
      ) : showSOT ? (
        <SOTUpload />
      ) : (
        <Reconciliation />
      )}
    </div>
  );
}

export default App; 