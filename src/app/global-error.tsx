"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" className="dark">
      <body
        style={{
          margin: 0,
          fontFamily: "system-ui, sans-serif",
          background: "#1a1614",
          color: "#d4c8b8",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
        }}
      >
        <div style={{ textAlign: "center", padding: "2rem" }}>
          <h1 style={{ fontSize: "1.5rem", color: "#f0e6d6" }}>
            Something went wrong
          </h1>
          <p style={{ marginTop: "0.5rem", opacity: 0.7 }}>
            {error.message || "An unexpected error occurred."}
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: "1.5rem",
              padding: "0.75rem 2rem",
              background: "#c4704b",
              color: "white",
              border: "none",
              borderRadius: "0.5rem",
              cursor: "pointer",
              fontSize: "0.875rem",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
