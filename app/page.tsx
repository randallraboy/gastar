import { auth, signIn } from "@/lib/auth";

export default async function HomePage() {
  const session = await auth();

  if (session?.user) {
    const { redirect } = await import("next/navigation");
    redirect("/expenses");
  }

  return (
    <main className="container" style={{ paddingTop: "4rem", textAlign: "center" }}>
      <h1>gastar</h1>
      <p style={{ color: "var(--muted)", marginBottom: "2rem" }}>
        Personal expense tracker for allowlisted Google accounts.
      </p>
      <form
        action={async () => {
          "use server";
          await signIn("google");
        }}
      >
        <button type="submit" className="btn btn-primary">
          Sign in with Google
        </button>
      </form>
    </main>
  );
}
