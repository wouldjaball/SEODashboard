import Link from "next/link"

export default function Home() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background p-6 md:p-10">
      <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
        <h1 className="text-4xl font-bold">Welcome to the Transit Dashboard</h1>
        <p className="text-muted-foreground max-w-md">
          Your comprehensive analytics platform for tracking and managing transit data.
        </p>
        <Link
          href="/auth/login"
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
        >
          Sign In
        </Link>
      </div>
      <footer className="w-full border-t py-6">
        <div className="flex justify-center gap-6 text-sm text-muted-foreground">
          <Link href="/privacy" className="hover:underline">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:underline">
            Terms and Conditions
          </Link>
        </div>
      </footer>
    </div>
  )
}
