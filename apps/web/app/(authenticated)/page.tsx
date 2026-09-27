import { signedInPerson, whoAmI } from "@/lib/dal";

const recognition = {
  match: "The B1 Budget API recognises you.",
  mismatch: "The B1 Budget API answered for someone other than you.",
  unauthorized: "The B1 Budget API did not accept your sign-in.",
  // ADR-35: stands in for the no-access page until it is built.
  forbidden: "Your BooleanOne account has no access to the B1 Budget API.",
} as const;

export default async function Page() {
  const [person, me] = await Promise.all([signedInPerson(), whoAmI()]);

  const outcome = me.status === "ok" ? (me.matches ? "match" : "mismatch") : me.status;

  return (
    <main className="flex min-h-svh flex-col gap-4 p-6">
      <h1 className="text-2xl font-medium">B1 Budget</h1>
      <p>Signed in as {person.name}.</p>
      <p data-api-recognition={outcome}>{recognition[outcome]}</p>
    </main>
  );
}
