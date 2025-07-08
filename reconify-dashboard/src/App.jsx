import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Home from './pages/Home.jsx';
import Config from './pages/Config.jsx';
import ConfigAdd from './pages/ConfigAdd.jsx';
import ConfigModify from './pages/ConfigModify.jsx';
import ConfigDelete from './pages/ConfigDelete.jsx';
import SOT from './pages/SOT.jsx';
import Recertification from './pages/Recertification.jsx';
import Reports from './pages/Reports.jsx';
import AuditTrails from './pages/AuditTrails.jsx';
import Reconciliation from './pages/Reconciliation.jsx';
import Document from './pages/Document.jsx';
import './App.css'

export default function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<Navigate to="/reconciliation" replace />} />
        <Route path="/home" element={<Home />} />
        <Route path="/config" element={<Config />} />
        <Route path="/config/add" element={<Config />} />
        <Route path="/config/modify" element={<Config />} />
        <Route path="/config/delete" element={<Config />} />
        <Route path="/sot" element={<SOT />} />
        <Route path="/reconciliation" element={<Reconciliation />} />
        <Route path="/recertification" element={<Recertification />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/audit-trails" element={<AuditTrails />} />
        <Route path="/documents/:id" element={<Document />} />
      </Routes>
    </Router>
  );
}
