import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/");
  }

  return (
    <>
      <nav className="nav">
        <Link href="/expenses">Expenses</Link>
        <Link href="/receipts">Receipts</Link>
        <Link href="/categories">Categories</Link>
        <span
          style={{ marginLeft: "auto", color: "var(--muted)", fontSize: "0.875rem" }}
        >
          {session.user.email}
        </span>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}
        >
          <button type="submit" className="btn">
            Sign out
          </button>
        </form>
      </nav>
      <div className="container">{children}</div>
    </>
  );
}
