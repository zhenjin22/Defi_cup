import { signInWithEmail } from "@/app/actions/auth";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const checkEmail = sp.check_email === "1";
  const error = typeof sp.error === "string" ? sp.error : null;

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-6">
          <p className="text-sm text-muted">Défi Cup Juniors Summer 2026</p>
          <h1 className="text-2xl font-semibold tracking-tight">Admin sign-in</h1>
          <p className="mt-2 text-sm text-muted">
            Organisers only — request a magic link with the email that was allow-listed in Supabase.
          </p>
        </div>

        <Card title="Email magic link">
          {checkEmail ? (
            <div className="rounded-xl border border-border bg-foreground/5 p-3 text-sm">
              Check your inbox for the Supabase login link.
            </div>
          ) : null}
          {error ? (
            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <form action={signInWithEmail} className="mt-4 space-y-4">
            <Field label="Email">
              <Input type="email" name="email" placeholder="organiser@club.com" required />
            </Field>
            <Button type="submit" className="w-full">
              Send link
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
