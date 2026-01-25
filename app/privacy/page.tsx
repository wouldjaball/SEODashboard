import Link from "next/link"

export const metadata = {
  title: "Privacy Policy - The Transit Dashboard",
  description: "Privacy Policy for The Transit Dashboard",
}

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-svh bg-background">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <Link href="/" className="text-sm text-muted-foreground hover:underline">
          &larr; Back to Home
        </Link>

        <h1 className="mt-8 text-3xl font-bold">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: January 25, 2026</p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="text-lg font-semibold text-foreground">1. Introduction</h2>
            <p className="mt-2">
              Welcome to The Transit Dashboard (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;). We are committed to protecting your privacy and personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our analytics dashboard service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">2. Information We Collect</h2>
            <p className="mt-2">We may collect the following types of information:</p>
            <ul className="mt-2 list-disc pl-6 space-y-1">
              <li><strong>Account Information:</strong> When you create an account, we collect your name, email address, and password.</li>
              <li><strong>Authentication Data:</strong> We use Google OAuth to authenticate your access to Google Analytics, YouTube Analytics, and Google Search Console. We store OAuth tokens securely to maintain your authorized connections.</li>
              <li><strong>Analytics Data:</strong> We access and display analytics data from your connected Google services, including website traffic, YouTube channel statistics, and search performance metrics.</li>
              <li><strong>Usage Data:</strong> We collect information about how you interact with our service, including access times, pages viewed, and features used.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">3. How We Use Your Information</h2>
            <p className="mt-2">We use the collected information to:</p>
            <ul className="mt-2 list-disc pl-6 space-y-1">
              <li>Provide, operate, and maintain our analytics dashboard service</li>
              <li>Display your analytics data from connected Google services</li>
              <li>Authenticate your identity and authorize access to your accounts</li>
              <li>Improve and personalize your experience</li>
              <li>Communicate with you about service updates and support</li>
              <li>Ensure the security and integrity of our service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">4. Data Sharing and Disclosure</h2>
            <p className="mt-2">
              We do not sell, trade, or otherwise transfer your personal information to third parties. We may share information only in the following circumstances:
            </p>
            <ul className="mt-2 list-disc pl-6 space-y-1">
              <li><strong>Service Providers:</strong> We may share data with trusted third-party service providers who assist us in operating our service (e.g., hosting providers, authentication services).</li>
              <li><strong>Legal Requirements:</strong> We may disclose information if required by law or in response to valid legal requests.</li>
              <li><strong>Business Transfers:</strong> In the event of a merger, acquisition, or sale of assets, your information may be transferred as part of that transaction.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">5. Data Security</h2>
            <p className="mt-2">
              We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. This includes encryption of sensitive data, secure OAuth token storage, and regular security assessments.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">6. Data Retention</h2>
            <p className="mt-2">
              We retain your personal information only for as long as necessary to fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is required by law. You may request deletion of your account and associated data at any time.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">7. Your Rights</h2>
            <p className="mt-2">Depending on your location, you may have the following rights:</p>
            <ul className="mt-2 list-disc pl-6 space-y-1">
              <li>Access and receive a copy of your personal data</li>
              <li>Rectify inaccurate or incomplete personal data</li>
              <li>Request deletion of your personal data</li>
              <li>Object to or restrict processing of your personal data</li>
              <li>Data portability</li>
              <li>Withdraw consent at any time</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">8. Third-Party Services</h2>
            <p className="mt-2">
              Our service integrates with Google services (Google Analytics, YouTube Analytics, Google Search Console). Your use of these services is subject to Google&apos;s Privacy Policy. We only access data that you explicitly authorize through the OAuth consent process.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">9. Cookies and Tracking</h2>
            <p className="mt-2">
              We use cookies and similar tracking technologies to maintain your session, remember your preferences, and improve our service. You can control cookie settings through your browser preferences.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">10. Children&apos;s Privacy</h2>
            <p className="mt-2">
              Our service is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If we become aware that we have collected personal information from a child under 13, we will take steps to delete that information.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">11. Changes to This Privacy Policy</h2>
            <p className="mt-2">
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the &quot;Last updated&quot; date. You are advised to review this Privacy Policy periodically for any changes.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">12. Contact Us</h2>
            <p className="mt-2">
              If you have any questions about this Privacy Policy or our data practices, please contact us at:
            </p>
            <p className="mt-2">
              Email: contact@thetransitdash.com
            </p>
          </section>
        </div>

        <footer className="mt-12 border-t pt-6">
          <div className="flex gap-6 text-sm text-muted-foreground">
            <Link href="/privacy" className="hover:underline">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:underline">
              Terms and Conditions
            </Link>
          </div>
        </footer>
      </div>
    </div>
  )
}
