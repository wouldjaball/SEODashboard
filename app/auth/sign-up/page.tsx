import { SignUpForm } from "@/components/auth/sign-up-form"

export const dynamic = "force-dynamic"

export default function SignUpPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-2">
            <h1 className="text-2xl font-bold">Create an account</h1>
            <p className="text-balance text-center text-sm text-muted-foreground">
              Enter your details below to create your account
            </p>
          </div>
          <SignUpForm />
        </div>
      </div>
    </div>
  )
}
