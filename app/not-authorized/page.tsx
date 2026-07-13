import Link from "next/link";
import { faArrowLeft, faLock } from "@fortawesome/free-solid-svg-icons";
import { Icon } from "@/components/ui/Icon";

export default function NotAuthorizedPage() {
  return (
    <main className="hero">
      <span className="hero-mark" style={{ background: "var(--danger)" }}>
        <Icon name={faLock} />
      </span>
      <h1>Not authorized</h1>
      <p>Your Google account is not on the allowlist for gastar.</p>
      <div className="hero-card">
        <Link href="/" className="btn btn-block">
          <Icon name={faArrowLeft} />
          <span>Back to sign in</span>
        </Link>
      </div>
    </main>
  );
}
