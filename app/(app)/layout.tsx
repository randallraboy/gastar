import Link from "next/link";
import { faRightFromBracket, faWallet } from "@fortawesome/free-solid-svg-icons";
import { AppNav } from "@/components/AppNav";
import { Icon } from "@/components/ui/Icon";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { ToastProvider } from "@/components/ui/Toast";
import { ConfirmProvider } from "@/components/ui/ConfirmDialog";
import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/");
  }

  return (
    <ToastProvider>
      <ConfirmProvider>
        <div className="app-shell">
          <header className="app-header">
            <Link href="/expenses" className="app-header-brand">
              <span className="brand-mark">
                <Icon name={faWallet} />
              </span>
              gastar
            </Link>
            <AppNav />
            <div className="app-header-account">
              <span className="app-header-email">{session.user.email}</span>
              <div className="app-header-account-controls">
                <ThemeToggle />
                <form
                  action={async () => {
                    "use server";
                    await signOut({ redirectTo: "/" });
                  }}
                >
                  <button type="submit" className="btn btn-compact btn-ghost">
                    <Icon name={faRightFromBracket} />
                    <span>Sign out</span>
                  </button>
                </form>
              </div>
            </div>
          </header>
          <main className="container app-content">{children}</main>
        </div>
      </ConfirmProvider>
    </ToastProvider>
  );
}
