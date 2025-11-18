import React, { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

interface Board {
  id: number;
  name: string;
}

interface Column {
  id: number;
  board_id: number;
  name: string;
  position: number;
}

type BackendStatus = "checking" | "ok" | "error";

const ACCESS_TOKEN_KEY = "branches_access_token";

// Simple color palette (navy + Lions blue accent)
const colors = {
  bgNavy: "#0F1729", // page background
  panel: "#141E2F", // cards / sidebar
  accent: "#00A0D8", // Detroit Lions-ish blue
  accentHover: "#1BB3E5",
  textPrimary: "#F9FAFB",
  textMuted: "#9CA3AF",
  borderSubtle: "#1E293B",
  success: "#22C55E",
  danger: "#EF4444",
};

const App: React.FC = () => {
  // Auth state
  const [email, setEmail] = useState("test@example.com");
  const [password, setPassword] = useState("secret123");
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);

  // Data / UI state
  const [backendStatus, setBackendStatus] = useState<BackendStatus>("checking");
  const [boards, setBoards] = useState<Board[]>([]);
  const [newBoardName, setNewBoardName] = useState("");
  const [selectedBoardId, setSelectedBoardId] = useState<number | null>(null);
  const [columns, setColumns] = useState<Column[]>([]);

  // ---------- helpers ----------

  const authHeaders = (): HeadersInit => {
    const h: HeadersInit = { Accept: "application/json" };
    if (accessToken) {
      h["Authorization"] = `Bearer ${accessToken}`;
    }
    return h;
  };

  const fullJsonHeaders = (): HeadersInit => {
    const h: HeadersInit = {
      Accept: "application/json",
      "Content-Type": "application/json",
    };
    if (accessToken) {
      h["Authorization"] = `Bearer ${accessToken}`;
    }
    return h;
  };

  const showError = (msg: string) => alert(msg);

  const selectedBoard =
    boards.find((b) => b.id === selectedBoardId) ?? boards[0] ?? null;

  // ---------- effects ----------

  // load token from localStorage on mount
  useEffect(() => {
    const stored = window.localStorage.getItem(ACCESS_TOKEN_KEY);
    if (stored) setAccessToken(stored);
  }, []);

  // backend health
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch(`${API_URL}/health`);
        if (!res.ok) throw new Error();
        setBackendStatus("ok");
      } catch {
        setBackendStatus("error");
      }
    };
    checkHealth();
  }, []);

  // when we have a token, load user + boards
  useEffect(() => {
    if (!accessToken) {
      setCurrentUserEmail(null);
      setBoards([]);
      setSelectedBoardId(null);
      setColumns([]);
      return;
    }

    const initAuthed = async () => {
      try {
        await fetchCurrentUser();
        await fetchBoards();
      } catch (err) {
        console.error("Failed to init with token:", err);
        handleLogout();
      }
    };

    void initAuthed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  // when selected board changes, load its columns
  useEffect(() => {
    if (!accessToken || !selectedBoardId) {
      setColumns([]);
      return;
    }
    void fetchColumns(selectedBoardId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBoardId, accessToken]);

  // ---------- API calls ----------

  const fetchCurrentUser = async () => {
    const res = await fetch(`${API_URL}/auth/me`, {
      method: "GET",
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch current user");
    const data = (await res.json()) as { email: string };
    setCurrentUserEmail(data.email);
  };

  const fetchBoards = async () => {
    if (!accessToken) return;
    const res = await fetch(`${API_URL}/boards`, {
      method: "GET",
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch boards");
    const data = (await res.json()) as Board[];
    setBoards(data);

    // If nothing selected yet, select the first board
    if (!selectedBoardId && data.length > 0) {
      setSelectedBoardId(data[0].id);
    }
  };

  const fetchColumns = async (boardId: number) => {
    const res = await fetch(`${API_URL}/boards/${boardId}/columns`, {
      method: "GET",
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch columns");
    const data = (await res.json()) as Column[];
    setColumns(data);
  };

  // IMPORTANT: send form data for OAuth2PasswordRequestForm
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const body = new URLSearchParams();
      body.append("username", email);
      body.append("password", password);

      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      });

      if (!res.ok) {
        let detail = "Login failed";
        try {
          const errBody = await res.json();
          if (typeof errBody?.detail === "string") {
            detail = errBody.detail;
          }
        } catch {
          // ignore
        }
        showError(detail);
        return;
      }

      const data = (await res.json()) as {
        access_token: string;
        refresh_token: string;
        token_type: string;
      };

      window.localStorage.setItem(ACCESS_TOKEN_KEY, data.access_token);
      setAccessToken(data.access_token);
    } catch (err) {
      console.error(err);
      showError("Network error while logging in.");
    }
  };

  const handleLogout = () => {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    setAccessToken(null);
    setCurrentUserEmail(null);
    setBoards([]);
    setSelectedBoardId(null);
    setColumns([]);
  };

  const handleWhoAmI = async () => {
    try {
      await fetchCurrentUser();
      if (currentUserEmail) {
        alert(`You are ${currentUserEmail}`);
      }
    } catch (err) {
      console.error(err);
      showError("Failed to fetch user info.");
    }
  };

  const handleCreateBoard = async () => {
    const name = newBoardName.trim();
    if (!name) return;

    try {
      const res = await fetch(`${API_URL}/boards`, {
        method: "POST",
        headers: fullJsonHeaders(),
        body: JSON.stringify({ name }),
      });

      if (!res.ok) {
        let detail = "Failed to create board";
        try {
          const errBody = await res.json();
          if (typeof errBody?.detail === "string") {
            detail = errBody.detail;
          }
        } catch {
          // ignore
        }
        showError(detail);
        return;
      }

      const created = (await res.json()) as Board;
      setBoards((prev) => [...prev, created]);
      setNewBoardName("");
      setSelectedBoardId(created.id);
      setColumns([]);
    } catch (err) {
      console.error(err);
      showError("Network error while creating board.");
    }
  };

  const handleCreateColumn = async () => {
    if (!selectedBoardId) return;
    const name = window.prompt("Column name?");
    if (!name) return;

    try {
      const res = await fetch(
        `${API_URL}/boards/${selectedBoardId}/columns`,
        {
          method: "POST",
          headers: fullJsonHeaders(),
          body: JSON.stringify({ name }),
        }
      );

      if (!res.ok) {
        let detail = "Failed to create column";
        try {
          const errBody = await res.json();
          if (typeof errBody?.detail === "string") {
            detail = errBody.detail;
          }
        } catch {
          // ignore
        }
        showError(detail);
        return;
      }

      const created = (await res.json()) as Column;
      setColumns((prev) => [...prev, created]);
    } catch (err) {
      console.error(err);
      showError("Network error while creating column.");
    }
  };

  const handleSelectBoard = (boardId: number) => {
    setSelectedBoardId(boardId);
  };

  // ---------- render helpers ----------

  const renderBackendStatus = () => {
    if (backendStatus === "checking") {
      return <span style={{ color: colors.textMuted }}>checking…</span>;
    }
    if (backendStatus === "ok") {
      return <span style={{ color: colors.success }}>ok</span>;
    }
    return <span style={{ color: colors.danger }}>error</span>;
  };

  const loggedOut = !accessToken || !currentUserEmail;

  // ---------- LOGGED OUT: full-screen navy with centered card ----------

  if (loggedOut) {
    return (
      <div
        style={{
          minHeight: "100vh",
          width: "100%",
          backgroundColor: colors.bgNavy,
          color: colors.textPrimary,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: "420px",
            maxWidth: "90vw",
            backgroundColor: colors.panel,
            borderRadius: "24px",
            padding: "32px 32px 24px",
            boxShadow: "0 25px 60px rgba(0,0,0,0.75)",
            border: `1px solid ${colors.borderSubtle}`,
          }}
        >
          <div style={{ marginBottom: "24px" }}>
            <h1
              style={{
                fontSize: "32px",
                fontWeight: 700,
                margin: 0,
                marginBottom: "4px",
              }}
            >
              Branches
            </h1>
            <p
              style={{
                fontSize: "12px",
                color: colors.textMuted,
                margin: 0,
              }}
            >
              API:{" "}
              <span
                style={{ fontFamily: "monospace", color: colors.textPrimary }}
              >
                {API_URL}
              </span>
            </p>
          </div>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: "14px" }}>
              <label
                htmlFor="email"
                style={{
                  display: "block",
                  fontSize: "13px",
                  marginBottom: "4px",
                }}
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                style={{
                  width: "100%",
                  fontSize: "13px",
                  padding: "8px 10px",
                  borderRadius: "8px",
                  border: `1px solid ${colors.borderSubtle}`,
                  backgroundColor: "#020617",
                  color: colors.textPrimary,
                }}
              />
            </div>

            <div style={{ marginBottom: "18px" }}>
              <label
                htmlFor="password"
                style={{
                  display: "block",
                  fontSize: "13px",
                  marginBottom: "4px",
                }}
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                style={{
                  width: "100%",
                  fontSize: "13px",
                  padding: "8px 10px",
                  borderRadius: "8px",
                  border: `1px solid ${colors.borderSubtle}`,
                  backgroundColor: "#020617",
                  color: colors.textPrimary,
                }}
              />
            </div>

            <button
              type="submit"
              style={{
                width: "100%",
                border: "none",
                borderRadius: "999px",
                padding: "10px 0",
                fontSize: "14px",
                fontWeight: 600,
                backgroundColor: colors.accent,
                color: colors.textPrimary,
                cursor: "pointer",
              }}
              onMouseOver={(e) =>
                (e.currentTarget.style.backgroundColor = colors.accentHover)
              }
              onMouseOut={(e) =>
                (e.currentTarget.style.backgroundColor = colors.accent)
              }
            >
              Log in
            </button>
          </form>

          <div
            style={{
              marginTop: "16px",
              fontSize: "11px",
              color: colors.textMuted,
            }}
          >
            Backend status: {renderBackendStatus()}
          </div>
        </div>
      </div>
    );
  }

  // ---------- LOGGED IN: left panel + board + columns ----------

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        backgroundColor: colors.bgNavy,
        color: colors.textPrimary,
      }}
    >
      {/* left sidebar */}
      <aside
        style={{
          width: "360px",
          padding: "32px 24px",
          backgroundColor: colors.panel,
          borderRight: `1px solid ${colors.borderSubtle}`,
          display: "flex",
          flexDirection: "column",
          gap: "24px",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "32px",
              fontWeight: 700,
              margin: 0,
              marginBottom: "6px",
            }}
          >
            Branches
          </h1>
          <p
            style={{
              fontSize: "12px",
              color: colors.textMuted,
              margin: 0,
            }}
          >
            API:{" "}
            <span
              style={{ fontFamily: "monospace", color: colors.textPrimary }}
            >
              {API_URL}
            </span>
          </p>
        </div>

        {/* auth controls */}
        <div style={{ fontSize: "13px" }}>
          <p style={{ marginBottom: "8px" }}>
            Logged in as{" "}
            <span style={{ fontWeight: 600 }}>{currentUserEmail}</span>
          </p>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={handleWhoAmI}
              style={{
                flex: 1,
                borderRadius: "999px",
                border: "none",
                padding: "8px 0",
                fontSize: "13px",
                backgroundColor: "#1F2937",
                color: colors.textPrimary,
                cursor: "pointer",
              }}
            >
              Who am I?
            </button>
            <button
              onClick={handleLogout}
              style={{
                borderRadius: "999px",
                border: "none",
                padding: "8px 14px",
                fontSize: "13px",
                backgroundColor: colors.danger,
                color: colors.textPrimary,
                cursor: "pointer",
              }}
            >
              Log out
            </button>
          </div>
        </div>

        {/* status */}
        <div style={{ fontSize: "11px", color: colors.textMuted }}>
          <p>
            Access token present?{" "}
            <span style={{ color: colors.success }}>
              {accessToken ? "yes" : "no"}
            </span>
          </p>
          <p>Backend status: {renderBackendStatus()}</p>
          <p>
            Me:{" "}
            <span style={{ color: colors.textPrimary }}>
              {currentUserEmail ?? "unknown"}
            </span>
          </p>
        </div>

        {/* boards panel */}
        <section
          style={{
            backgroundColor: "#020617",
            borderRadius: "16px",
            padding: "14px 14px 12px",
            border: `1px solid ${colors.borderSubtle}`,
            fontSize: "13px",
          }}
        >
          <h2 style={{ fontSize: "13px", margin: 0, marginBottom: "8px" }}>
            Boards
          </h2>

          <ul style={{ listStyle: "none", paddingLeft: 0, margin: 0 }}>
            {boards.map((b) => {
              const selected = b.id === selectedBoardId;
              return (
                <li key={b.id} style={{ marginBottom: "4px" }}>
                  <button
                    onClick={() => handleSelectBoard(b.id)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      borderRadius: "999px",
                      border: "none",
                      padding: "6px 10px",
                      fontSize: "13px",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      cursor: "pointer",
                      backgroundColor: selected ? "#111827" : "#020617",
                      color: colors.textPrimary,
                    }}
                  >
                    <span
                      style={{
                        width: "6px",
                        height: "6px",
                        borderRadius: "999px",
                        backgroundColor: colors.accent,
                      }}
                    />
                    <span>{b.name}</span>
                  </button>
                </li>
              );
            })}
            {boards.length === 0 && (
              <li style={{ color: colors.textMuted, fontSize: "12px" }}>
                No boards yet. Create one below.
              </li>
            )}
          </ul>

          <div
            style={{
              display: "flex",
              gap: "8px",
              marginTop: "10px",
              marginBottom: "8px",
            }}
          >
            <input
              type="text"
              placeholder="New board name"
              value={newBoardName}
              onChange={(e) => setNewBoardName(e.target.value)}
              style={{
                flex: 1,
                borderRadius: "8px",
                border: `1px solid ${colors.borderSubtle}`,
                backgroundColor: colors.bgNavy,
                color: colors.textPrimary,
                fontSize: "12px",
                padding: "6px 8px",
              }}
            />
            <button
              onClick={handleCreateBoard}
              style={{
                borderRadius: "999px",
                border: "none",
                padding: "6px 12px",
                fontSize: "12px",
                fontWeight: 600,
                backgroundColor: colors.success,
                color: colors.textPrimary,
                cursor: "pointer",
              }}
            >
              Create
            </button>
          </div>

          <button
            onClick={fetchBoards}
            style={{
              width: "100%",
              borderRadius: "999px",
              border: "none",
              padding: "6px 0",
              fontSize: "12px",
              backgroundColor: "#1F2937",
              color: colors.textPrimary,
              cursor: "pointer",
            }}
          >
            Reload boards
          </button>
        </section>
      </aside>

      {/* right side – board header + columns */}
      <main
        style={{
          flex: 1,
          backgroundColor: colors.bgNavy,
          padding: "24px 32px",
        }}
      >
        {selectedBoard ? (
          <>
            {/* board header card */}
            <div
              style={{
                backgroundColor: "#050816",
                borderRadius: "20px",
                padding: "16px 20px",
                border: `1px solid ${colors.borderSubtle}`,
                boxShadow: "0 25px 60px rgba(0,0,0,0.5)",
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: "20px",
                  marginBottom: "4px",
                }}
              >
                {selectedBoard.name}
              </h2>
              <p
                style={{
                  margin: 0,
                  fontSize: "12px",
                  color: colors.textMuted,
                }}
              >
                This is where columns and cards for this board will go.
              </p>
            </div>

            {/* columns row */}
            <div
              style={{
                marginTop: "24px",
                display: "flex",
                gap: "16px",
                alignItems: "flex-start",
              }}
            >
              {columns.map((col) => (
                <div
                  key={col.id}
                  style={{
                    width: "260px",
                    backgroundColor: colors.panel,
                    borderRadius: "16px",
                    padding: "12px 12px 10px",
                    border: `1px solid ${colors.borderSubtle}`,
                  }}
                >
                  <div
                    style={{
                      fontSize: "14px",
                      fontWeight: 600,
                      marginBottom: "6px",
                    }}
                  >
                    {col.name}
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: colors.textMuted,
                    }}
                  >
                    (Cards will go here)
                  </div>
                </div>
              ))}

              {/* Add column card */}
              <button
                onClick={handleCreateColumn}
                style={{
                  width: "260px",
                  borderRadius: "16px",
                  padding: "12px",
                  border: `1px dashed ${colors.borderSubtle}`,
                  backgroundColor: "transparent",
                  color: colors.textMuted,
                  cursor: "pointer",
                  fontSize: "13px",
                }}
              >
                + Add column
              </button>
            </div>
          </>
        ) : (
          <p style={{ color: colors.textMuted, fontSize: "13px" }}>
            No board selected yet.
          </p>
        )}
      </main>
    </div>
  );
};

export default App;
