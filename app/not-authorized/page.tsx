import Link from "next/link";

export default function NotAuthorizedPage() {
  return (
    <main className="container" style={{ paddingTop: "4rem", textAlign: "center" }}>
      <h1>Not authorized</h1>
      <p style={{ color: "var(--muted)" }}>
        Your Google account is not on the allowlist for gastar.
      </p>
      <Link
        href="/"
        className="btn"
        style={{ marginTop: "1rem", display: "inline-block" }}
      >
        Back to sign in
      </Link>
    </main>
  );
}
