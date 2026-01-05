import { SVGProps } from "react"

interface IconProps extends SVGProps<SVGSVGElement> {
  className?: string
}

// Google Analytics icon (GA4 style - chart bars)
export function GoogleAnalyticsIcon({ className, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path
        d="M20 4v16a2 2 0 01-2 2h-2a2 2 0 01-2-2V4a2 2 0 012-2h2a2 2 0 012 2z"
        fill="#F9AB00"
      />
      <path
        d="M13 10v10a2 2 0 01-2 2H9a2 2 0 01-2-2V10a2 2 0 012-2h2a2 2 0 012 2z"
        fill="#E37400"
      />
      <circle cx="5" cy="19" r="3" fill="#E37400" />
    </svg>
  )
}

// Google Search Console icon (magnifying glass with chart)
export function SearchConsoleIcon({ className, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <circle
        cx="10"
        cy="10"
        r="7"
        stroke="#4285F4"
        strokeWidth="2.5"
        fill="none"
      />
      <path
        d="M15.5 15.5L21 21"
        stroke="#4285F4"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M7 12V10M10 12V8M13 12V9"
        stroke="#34A853"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

// YouTube icon (play button style)
export function YouTubeIcon({ className, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path
        d="M22.54 6.42a2.78 2.78 0 00-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 00-1.94 2A29 29 0 001 11.75a29 29 0 00.46 5.33A2.78 2.78 0 003.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 001.94-2 29 29 0 00.46-5.25 29 29 0 00-.46-5.33z"
        fill="#FF0000"
      />
      <path d="M9.75 15.02l5.75-3.27-5.75-3.27v6.54z" fill="white" />
    </svg>
  )
}

// LinkedIn icon (in logo style)
export function LinkedInIcon({ className, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <rect x="2" y="2" width="20" height="20" rx="2" fill="#0A66C2" />
      <path
        d="M7.5 10v7M7.5 7v.01"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M11 17v-4c0-1.5 1-2.5 2.5-2.5s2.5 1 2.5 2.5v4"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M11 13h5" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
