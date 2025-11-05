import { useEffect, useState } from "react";

export default function App() {
  const [status, setStatus] = useState<string>("loading...");
  const apiBase = import.meta.env.VITE_API_URL;

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${apiBase}/health`);
        const data = await res.json();
        setStatus(data?.status ?? "unknown");
      } catch (e) {
        console.error(e);
        setStatus("error");
      }
    })();
  }, [apiBase]);

  return (
    <div style={{ padding: 24, color: "white", fontFamily: "system-ui, sans-serif" }}>
      <h1>Branches</h1>
      <p>Backend status: <strong>{status}</strong></p>
      <small>API: {apiBase}</small>
    </div>
  );
}

