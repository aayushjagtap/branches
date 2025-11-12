import { useState } from "react";
import "./App.css";
import { login, me } from "./lib/api";

function App() {
  const [email, setEmail] = useState("test@example.com");
  const [password, setPassword] = useState("secret123");
  const [token, setToken] = useState<string | null>(localStorage.getItem("access_token"));
  const [whoami, setWhoami] = useState<string>("");

  const onLogin = async () => {
    try {
      const res = await login(email, password);
      localStorage.setItem("access_token", res.access_token);
      setToken(res.access_token);
      const profile = await me(res.access_token);
      setWhoami(profile.email);
    } catch (e: any) {
      alert(e.message ?? "Login error");
      setWhoami("");
    }
  };

  const checkMe = async () => {
    if (!token) return alert("No token stored");
    try {
      const profile = await me(token);
      setWhoami(profile.email);
    } catch (e: any) {
      alert(e.message ?? "Check me error");
      setWhoami("");
    }
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    setToken(null);
    setWhoami("");
  };

  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";

  return (
    <div style={{ padding: 24 }}>
      <h1>Branches</h1>
      <p>API: {apiUrl}</p>

      <div style={{ display: "grid", gap: 8, maxWidth: 360 }}>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email"
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="password"
          type="password"
        />
        <button onClick={onLogin}>Log in</button>
        <button onClick={checkMe} disabled={!token}>Who am I?</button>
        <button onClick={logout} disabled={!token}>Log out</button>
      </div>

      <div style={{ marginTop: 16 }}>
        <strong>Access token present?</strong> {token ? "yes" : "no"}
      </div>
      <div>
        <strong>Backend status:</strong> {whoami ? "ok" : token ? "token set, click Who am I" : "not authed"}
      </div>
      {whoami && (
        <div style={{ marginTop: 8 }}>
          <strong>Me:</strong> {whoami}
        </div>
      )}
    </div>
  );
}

export default App;

