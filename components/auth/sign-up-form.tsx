"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"

interface SignUpFormProps extends React.ComponentProps<"div"> {
  redirectTo?: string
}

export function SignUpForm({ className, redirectTo = "/dashboard/executive", ...props }: SignUpFormProps) {
  const [accessCode, setAccessCode] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = React.useState(false)
  const [isValidatingCode, setIsValidatingCode] = React.useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function validateAccessCode(code: string): Promise<boolean> {
    try {
      const response = await fetch("/api/auth/validate-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      })
      const data = await response.json()
      return data.valid === true
    } catch {
      return false
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    // Validate access code first
    if (!accessCode.trim()) {
      setError("Access code is required")
      setIsLoading(false)
      return
    }

    const isValidCode = await validateAccessCode(accessCode)
    if (!isValidCode) {
      setError("Invalid access code")
      setIsLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      setIsLoading(false)
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters")
      setIsLoading(false)
      return
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}&access_code=${encodeURIComponent(accessCode.trim().toUpperCase())}`,
      },
    })

    if (error) {
      setError(error.message)
      setIsLoading(false)
      return
    }

    // Increment usage count
    try {
      await fetch("/api/auth/validate-code", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: accessCode }),
      })
    } catch {
      // Non-critical, don't fail signup
    }

    setSuccess(true)
    setIsLoading(false)
  }

  async function handleGoogleLogin() {
    setError(null)

    // Validate access code first
    if (!accessCode.trim()) {
      setError("Access code is required")
      return
    }

    setIsValidatingCode(true)
    const isValidCode = await validateAccessCode(accessCode)
    setIsValidatingCode(false)

    if (!isValidCode) {
      setError("Invalid access code")
      return
    }

    setIsGoogleLoading(true)

    // Store access code in sessionStorage for the callback to use
    sessionStorage.setItem("signup_access_code", accessCode.trim().toUpperCase())

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}&access_code=${encodeURIComponent(accessCode.trim().toUpperCase())}`,
      },
    })

    if (error) {
      setError(error.message)
      setIsGoogleLoading(false)
    }
  }

  if (success) {
    return (
      <div className={cn("grid gap-6", className)} {...props}>
        <div className="text-center">
          <h3 className="text-lg font-semibold">Check your email</h3>
          <p className="text-sm text-muted-foreground mt-2">
            We&apos;ve sent you a confirmation link. Please check your email to verify your account.
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push("/auth/login")}>
          Back to login
        </Button>
      </div>
    )
  }

  return (
    <div className={cn("grid gap-6", className)} {...props}>
      <form onSubmit={handleSignUp}>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="access-code">Access Code</Label>
            <Input
              id="access-code"
              type="text"
              placeholder="Enter your access code"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
              autoCapitalize="characters"
              autoComplete="off"
              disabled={isLoading || isGoogleLoading}
              required
            />
            <p className="text-xs text-muted-foreground">
              Contact an administrator to get an access code
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect="off"
              disabled={isLoading || isGoogleLoading}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              disabled={isLoading || isGoogleLoading}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="confirm-password">Confirm Password</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              disabled={isLoading || isGoogleLoading}
              required
            />
          </div>
          {error && (
            <div className="text-sm text-destructive">{error}</div>
          )}
          <Button type="submit" disabled={isLoading || isGoogleLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Account
          </Button>
        </div>
      </form>
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or continue with
          </span>
        </div>
      </div>
      <Button
        variant="outline"
        type="button"
        disabled={isLoading || isGoogleLoading || isValidatingCode}
        onClick={handleGoogleLogin}
      >
        {(isGoogleLoading || isValidatingCode) ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
        )}
        Sign up with Google
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <a
          href="/auth/login"
          className="underline underline-offset-4 hover:text-primary"
        >
          Sign in
        </a>
      </p>
    </div>
  )
}
