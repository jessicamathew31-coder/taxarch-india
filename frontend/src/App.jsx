import { useState } from "react";
import { BrowserRouter, Routes, Route, NavLink, useNavigate } from "react-router-dom";
import Home from "./pages/Home";
import Analyzer from "./pages/Analyzer";
import Lifecycle from "./pages/Lifecycle";
import Dashboard from "./pages/Dashboard";
import "./index.css";

function Nav() {
  return (
    <nav className="nav">
      <div className="nav-brand">
        <span className="nav-logo">T</span>
        <span className="nav-title">TaxArch<span className="nav-subtitle"> India</span></span>
      </div>
      <div className="nav-links">
        <NavLink to="/" end className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Home</NavLink>
        <NavLink to="/analyzer" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Analyser</NavLink>
        <NavLink to="/lifecycle" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Lifecycle</NavLink>
        <NavLink to="/dashboard" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Observatory</NavLink>
      </div>
    </nav>
  );
}

export default function App() {
  // Global profile state — persisted across page navigations
  // so the user fills the form once and sees results everywhere.
  const [profile, setProfile] = useState(null);
  const [results, setResults] = useState(null);

  return (
    <BrowserRouter>
      <div className="app">
        <Nav />
        <main className="main">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/analyzer" element={
              <Analyzer profile={profile} setProfile={setProfile} results={results} setResults={setResults} />
            } />
            <Route path="/lifecycle" element={
              <Lifecycle profile={profile} results={results} />
            } />
            <Route path="/dashboard" element={<Dashboard />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
