import { Button } from "@workspace/ui/components/button";
import { signIn } from "./sign-in";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string; returnTo?: string }>;
}) {
  const { reason, returnTo } = await searchParams;

  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <div className="flex max-w-md flex-col gap-4">
        <h1 className="text-2xl font-medium">B1 Budget</h1>
        {/* ADR-37: reason is a fixed set that Terraform and redirects depend on. Never echo it. */}
        {reason === "expired" && <p>Your session has ended. Please sign in again.</p>}
        <form action={signIn}>
          <input type="hidden" name="returnTo" value={returnTo ?? "/"} />
          <Button type="submit">Sign in with BooleanOne</Button>
        </form>
      </div>
    </main>
  );
}
