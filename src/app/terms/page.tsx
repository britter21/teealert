export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-10 md:py-16">
      <div className="mb-10">
        <div className="accent-line mb-6" />
        <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-tight text-[var(--color-cream)] sm:text-4xl">
          Terms of Service
        </h1>
        <p className="mt-3 text-sm text-[var(--color-sand-muted)]">
          Last updated: February 28, 2026
        </p>
      </div>

      <div className="space-y-8 text-sm leading-relaxed text-[var(--color-charcoal-text)]">
        <section>
          <h2 className="mb-3 font-[family-name:var(--font-display)] text-lg text-[var(--color-sand-bright)]">
            1. Acceptance of Terms
          </h2>
          <p>
            By accessing or using TeeAlert (&quot;the Service&quot;), you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the Service.
          </p>
        </section>

        <section>
          <h2 className="mb-3 font-[family-name:var(--font-display)] text-lg text-[var(--color-sand-bright)]">
            2. Description of Service
          </h2>
          <p>
            TeeAlert is a tee time notification service. We monitor publicly available tee time information from golf course booking platforms and notify you when tee times matching your preferences become available. TeeAlert does not book tee times on your behalf — you must complete all bookings directly through the course&apos;s booking platform.
          </p>
        </section>

        <section>
          <h2 className="mb-3 font-[family-name:var(--font-display)] text-lg text-[var(--color-sand-bright)]">
            3. Account Registration
          </h2>
          <p>
            You must create an account to use the Service. You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. You must provide accurate information when creating your account.
          </p>
        </section>

        <section>
          <h2 className="mb-3 font-[family-name:var(--font-display)] text-lg text-[var(--color-sand-bright)]">
            4. Free Trial and Subscriptions
          </h2>
          <p className="mb-3">
            New accounts receive a 14-day free trial with full access to the Service. After the trial period, a paid subscription is required to continue using the Service.
          </p>
          <p>
            Subscriptions are billed monthly. You may cancel your subscription at any time. Cancellation takes effect at the end of the current billing period. No refunds are provided for partial months.
          </p>
        </section>

        <section>
          <h2 className="mb-3 font-[family-name:var(--font-display)] text-lg text-[var(--color-sand-bright)]">
            5. Acceptable Use
          </h2>
          <p className="mb-3">You agree not to:</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>Use the Service for any unlawful purpose</li>
            <li>Attempt to interfere with or disrupt the Service</li>
            <li>Create multiple accounts to circumvent subscription limits</li>
            <li>Resell or redistribute notifications or data from the Service</li>
            <li>Use automated tools to interact with the Service beyond normal usage</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 font-[family-name:var(--font-display)] text-lg text-[var(--color-sand-bright)]">
            6. Service Availability
          </h2>
          <p>
            We strive to provide reliable monitoring and notifications, but we do not guarantee 100% uptime or that you will be notified of every matching tee time. Tee time availability data comes from third-party booking platforms that we do not control. The Service is provided &quot;as is&quot; without warranties of any kind.
          </p>
        </section>

        <section>
          <h2 className="mb-3 font-[family-name:var(--font-display)] text-lg text-[var(--color-sand-bright)]">
            7. Limitation of Liability
          </h2>
          <p>
            TeeAlert shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, or use, arising from your use of or inability to use the Service. Our total liability for any claim related to the Service shall not exceed the amount you have paid for the Service in the 12 months preceding the claim.
          </p>
        </section>

        <section>
          <h2 className="mb-3 font-[family-name:var(--font-display)] text-lg text-[var(--color-sand-bright)]">
            8. Intellectual Property
          </h2>
          <p>
            The Service, including its design, features, and content, is owned by TeeAlert. You may not copy, modify, distribute, or create derivative works based on the Service without our prior written consent.
          </p>
        </section>

        <section>
          <h2 className="mb-3 font-[family-name:var(--font-display)] text-lg text-[var(--color-sand-bright)]">
            9. Termination
          </h2>
          <p>
            We reserve the right to suspend or terminate your account at any time for violation of these terms or for any other reason at our sole discretion. You may delete your account at any time through the Settings page.
          </p>
        </section>

        <section>
          <h2 className="mb-3 font-[family-name:var(--font-display)] text-lg text-[var(--color-sand-bright)]">
            10. Changes to Terms
          </h2>
          <p>
            We may update these terms from time to time. Continued use of the Service after changes constitutes acceptance of the new terms. We will notify users of material changes via email.
          </p>
        </section>

        <section>
          <h2 className="mb-3 font-[family-name:var(--font-display)] text-lg text-[var(--color-sand-bright)]">
            11. Contact
          </h2>
          <p>
            For questions about these terms, contact us at{" "}
            <a
              href="mailto:support@teealert.app"
              className="text-[var(--color-terracotta)] hover:underline"
            >
              support@teealert.app
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
