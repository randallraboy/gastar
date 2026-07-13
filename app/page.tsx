import { faRightToBracket, faWallet } from "@fortawesome/free-solid-svg-icons";
import { Icon } from "@/components/ui/Icon";
import { auth, signIn } from "@/lib/auth";

export default async function HomePage() {
  const session = await auth();

  if (session?.user) {
    const { redirect } = await import("next/navigation");
    redirect("/expenses");
  }

  return (
    <main className="hero">
      <span className="hero-mark">
        <Icon name={faWallet} />
      </span>
      <h1>gastar</h1>
      <p>Personal expense tracker for allowlisted Google accounts.</p>
      <div className="hero-card">
        <form
          action={async () => {
            "use server";
            await signIn("google");
          }}
        >
          <button type="submit" className="btn btn-primary btn-block">
            <Icon name={faRightToBracket} />
            <span>Sign in with Google</span>
          </button>
        </form>
      </div>
    </main>
  );
}
