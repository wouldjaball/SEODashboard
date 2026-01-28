import Link from "next/link"

export const dynamic = "force-dynamic"

export default function SignUpPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6 text-center">
          <div className="flex flex-col items-center gap-2">
            <h1 className="text-2xl font-bold">Sign Up Not Available</h1>
            <p className="text-balance text-center text-sm text-muted-foreground">
              This application is invitation-only. Please contact your administrator to request access.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
