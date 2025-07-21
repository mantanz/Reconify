import React, { useState } from "react";
import AddPanel from "./AddPanel";
import ModifyPanel from "./ModifyPanel";
import DeletePanel from "./DeletePanel";
import SOTUpload from "./SOTUpload";
import Reconciliation from "./Reconciliation";
import UserSummary from "./UserSummary";

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
  const [showUserSummary, setShowUserSummary] = useState(false);

  return (
    <div style={{ fontFamily: "Segoe UI, Arial, sans-serif", background: "#f8f9fa", minHeight: "100vh" }}>
      <nav style={{ background: "#fff", padding: "16px 24px", boxShadow: "0 2px 4px rgba(0,0,0,0.06)", borderBottom: "1px solid #e9ecef" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h1 style={{ margin: 0, color: "#343a40", fontSize: 24, fontWeight: 600 }}>Reconify</h1>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ position: "relative" }}>
              <button
                style={{ 
                  background: !showSOT && !showRecon && !showUserSummary ? "#007bff" : "#495057", 
                  color: "#fff", 
                  border: "none", 
                  padding: "8px 18px", 
                  borderRadius: 4, 
                  cursor: "pointer", 
                  fontSize: 16, 
                  fontWeight: !showSOT && !showRecon && !showUserSummary ? 600 : 400 
                }}
                onClick={() => { setShowDropdown(!showDropdown); setShowSOT(false); setShowRecon(false); setShowUserSummary(false); }}
              >
                Panel Management ▼
              </button>
              {showDropdown && (
                <div style={{ 
                  position: "absolute", 
                  top: "100%", 
                  left: 0, 
                  background: "#fff", 
                  border: "1px solid #dee2e6", 
                  borderRadius: 4, 
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)", 
                  zIndex: 1000,
                  minWidth: 200
                }}>
                  {NAV_ITEMS.map(item => (
                    <button
                      key={item.key}
                      style={{ 
                        display: "block", 
                        width: "100%", 
                        textAlign: "left", 
                        padding: "12px 16px", 
                        border: "none", 
                        background: selected === item.key ? "#f8f9fa" : "#fff", 
                        color: selected === item.key ? "#007bff" : "#495057", 
                        cursor: "pointer", 
                        fontSize: 14,
                        fontWeight: selected === item.key ? 600 : 400
                      }}
                      onClick={() => { setSelected(item.key); setShowDropdown(false); }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              style={{ background: showSOT ? "#007bff" : "#495057", color: "#fff", border: "none", padding: "8px 18px", borderRadius: 4, cursor: "pointer", fontSize: 16, fontWeight: showSOT ? 600 : 400 }}
              onClick={() => { setShowSOT(true); setShowDropdown(false); setShowRecon(false); setShowUserSummary(false); }}
            >
              SOT Upload
            </button>
            <button
              style={{ background: showRecon ? "#007bff" : "#495057", color: "#fff", border: "none", padding: "8px 18px", borderRadius: 4, cursor: "pointer", fontSize: 16, fontWeight: showRecon ? 600 : 400 }}
              onClick={() => { setShowRecon(true); setShowDropdown(false); setShowSOT(false); setShowUserSummary(false); }}
            >
              Reconciliation
            </button>
            <button
              style={{ background: showUserSummary ? "#007bff" : "#495057", color: "#fff", border: "none", padding: "8px 18px", borderRadius: 4, cursor: "pointer", fontSize: 16, fontWeight: showUserSummary ? 600 : 400 }}
              onClick={() => { setShowUserSummary(true); setShowDropdown(false); setShowSOT(false); setShowRecon(false); }}
            >
              Reports
            </button>
          </div>
        </div>
      </nav>
      
      {!showSOT && !showRecon && !showUserSummary && (
        <div style={{ maxWidth: 500, margin: "40px auto", background: "#fff", borderRadius: 8, boxShadow: "0 2px 12px rgba(0,0,0,0.07)", padding: 32 }}>
          <h2 style={{ textAlign: "center", color: "#343a40", marginBottom: 32 }}>{NAV_ITEMS.find(i => i.key === selected).label}</h2>
          {NAV_ITEMS.find(i => i.key === selected).component}
        </div>
      )}
      
      {showSOT && <SOTUpload />}
      {showRecon && <Reconciliation />}
      {showUserSummary && <UserSummary />}
    </div>
  );
}

export default App; 