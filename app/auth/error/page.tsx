import { Button } from "@/components/ui/button"

export default function AuthErrorPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6 text-center">
          <div className="flex flex-col items-center gap-2">
            <h1 className="text-2xl font-bold">Authentication Error</h1>
            <p className="text-balance text-sm text-muted-foreground">
              Something went wrong during authentication. Please try again.
            </p>
          </div>
          <Button asChild>
            <a href="/auth/login">Back to login</a>
          </Button>
        </div>
      </div>
    </div>
  )
}
