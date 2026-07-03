import { AppNav } from "@/components/AppNav";
import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/");
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <AppNav />
        <div className="app-header-account">
          <span className="app-header-email">{session.user.email}</span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button type="submit" className="btn btn-compact">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="container app-content">{children}</main>
    </div>
  );
}
