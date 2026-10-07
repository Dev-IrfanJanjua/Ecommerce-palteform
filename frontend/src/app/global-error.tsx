"use client";

/**
 * Last-resort boundary, for a crash in the root layout itself.
 *
 * Because the layout is what failed, this must render its own <html> and
 * <body> — none of the app shell, fonts or tokens are available here, which is
 * why the styling is deliberately plain and inline.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          display: "flex",
          minHeight: "100vh",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          padding: "2rem",
          textAlign: "center",
        }}
      >
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600 }}>Something went wrong</h1>
        <p style={{ color: "#52607a", maxWidth: "28rem" }}>
          The page could not be loaded. Please try again.
        </p>
        {error.digest ? (
          <p style={{ color: "#52607a", fontSize: "0.75rem" }}>Reference: {error.digest}</p>
        ) : null}
        <button
          onClick={reset}
          style={{
            cursor: "pointer",
            borderRadius: "0.5rem",
            background: "#1d3557",
            color: "#fff",
            border: 0,
            padding: "0.625rem 1.25rem",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
