import Link from "next/link"

export const metadata = {
  title: "Terms and Conditions - The Transit Dashboard",
  description: "Terms and Conditions for The Transit Dashboard",
}

export default function TermsPage() {
  return (
    <div className="min-h-svh bg-background">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <Link href="/" className="text-sm text-muted-foreground hover:underline">
          &larr; Back to Home
        </Link>

        <h1 className="mt-8 text-3xl font-bold">Terms and Conditions</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: January 25, 2026</p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="text-lg font-semibold text-foreground">1. Acceptance of Terms</h2>
            <p className="mt-2">
              By accessing or using The Transit Dashboard (&quot;Service&quot;), you agree to be bound by these Terms and Conditions (&quot;Terms&quot;). If you do not agree to these Terms, you may not access or use the Service. These Terms constitute a legally binding agreement between you and The Transit Dashboard (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">2. Description of Service</h2>
            <p className="mt-2">
              The Transit Dashboard is an analytics platform that allows users to view and manage data from connected Google services, including Google Analytics, YouTube Analytics, and Google Search Console. The Service aggregates and displays analytics data to help users monitor their digital presence.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">3. Account Registration</h2>
            <p className="mt-2">To use the Service, you must:</p>
            <ul className="mt-2 list-disc pl-6 space-y-1">
              <li>Create an account with accurate and complete information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Promptly notify us of any unauthorized use of your account</li>
              <li>Be at least 13 years of age (or the minimum age in your jurisdiction)</li>
            </ul>
            <p className="mt-2">
              You are responsible for all activities that occur under your account.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">4. Authorization and API Access</h2>
            <p className="mt-2">
              By connecting your Google accounts to our Service, you authorize us to access and retrieve data from Google Analytics, YouTube Analytics, and Google Search Console on your behalf. You represent that you have the authority to grant such access and that your use complies with Google&apos;s Terms of Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">5. Acceptable Use</h2>
            <p className="mt-2">You agree not to:</p>
            <ul className="mt-2 list-disc pl-6 space-y-1">
              <li>Use the Service for any unlawful purpose or in violation of any applicable laws</li>
              <li>Attempt to gain unauthorized access to any part of the Service</li>
              <li>Interfere with or disrupt the Service or servers connected to the Service</li>
              <li>Reverse engineer, decompile, or disassemble any part of the Service</li>
              <li>Use automated systems or software to extract data from the Service</li>
              <li>Share your account credentials with third parties</li>
              <li>Misrepresent your identity or affiliation</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">6. Intellectual Property</h2>
            <p className="mt-2">
              The Service, including its original content, features, and functionality, is owned by The Transit Dashboard and is protected by copyright, trademark, and other intellectual property laws. You may not copy, modify, distribute, or create derivative works based on the Service without our express written permission.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">7. Third-Party Services</h2>
            <p className="mt-2">
              The Service integrates with third-party services, including Google APIs. Your use of these third-party services is subject to their respective terms of service and privacy policies. We are not responsible for the content, privacy practices, or availability of third-party services.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">8. Data Accuracy</h2>
            <p className="mt-2">
              While we strive to display accurate analytics data, we do not guarantee the accuracy, completeness, or timeliness of data retrieved from third-party services. The data displayed is dependent on the information provided by Google APIs and may be subject to delays or discrepancies.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">9. Service Availability</h2>
            <p className="mt-2">
              We strive to maintain high availability of the Service but do not guarantee uninterrupted access. The Service may be temporarily unavailable due to maintenance, updates, or circumstances beyond our control. We reserve the right to modify, suspend, or discontinue the Service at any time without notice.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">10. Disclaimer of Warranties</h2>
            <p className="mt-2">
              THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, SECURE, OR ERROR-FREE.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">11. Limitation of Liability</h2>
            <p className="mt-2">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT SHALL THE TRANSIT DASHBOARD, ITS DIRECTORS, EMPLOYEES, PARTNERS, OR AFFILIATES BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING WITHOUT LIMITATION, LOSS OF PROFITS, DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, ARISING OUT OF OR IN CONNECTION WITH YOUR USE OF THE SERVICE.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">12. Indemnification</h2>
            <p className="mt-2">
              You agree to indemnify, defend, and hold harmless The Transit Dashboard and its officers, directors, employees, and agents from and against any claims, liabilities, damages, losses, and expenses, including reasonable attorney&apos;s fees, arising out of or in any way connected with your access to or use of the Service or your violation of these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">13. Termination</h2>
            <p className="mt-2">
              We may terminate or suspend your account and access to the Service immediately, without prior notice or liability, for any reason, including if you breach these Terms. Upon termination, your right to use the Service will immediately cease. You may also terminate your account at any time by contacting us.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">14. Changes to Terms</h2>
            <p className="mt-2">
              We reserve the right to modify these Terms at any time. We will notify you of any changes by posting the new Terms on this page and updating the &quot;Last updated&quot; date. Your continued use of the Service after any changes constitutes acceptance of the new Terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">15. Governing Law</h2>
            <p className="mt-2">
              These Terms shall be governed by and construed in accordance with the laws of the United States, without regard to its conflict of law provisions. Any disputes arising from these Terms or the Service shall be resolved in the courts of competent jurisdiction.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">16. Severability</h2>
            <p className="mt-2">
              If any provision of these Terms is held to be invalid or unenforceable, the remaining provisions shall continue in full force and effect. The invalid or unenforceable provision shall be modified to the minimum extent necessary to make it valid and enforceable.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">17. Contact Us</h2>
            <p className="mt-2">
              If you have any questions about these Terms, please contact us at:
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
