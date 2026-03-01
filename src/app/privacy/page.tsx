export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-10 md:py-16">
      <div className="mb-10">
        <div className="accent-line mb-6" />
        <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-tight text-[var(--color-cream)] sm:text-4xl">
          Privacy Policy
        </h1>
        <p className="mt-3 text-sm text-[var(--color-sand-muted)]">
          Last updated: February 28, 2026
        </p>
      </div>

      <div className="space-y-8 text-sm leading-relaxed text-[var(--color-charcoal-text)]">
        <section>
          <h2 className="mb-3 font-[family-name:var(--font-display)] text-lg text-[var(--color-sand-bright)]">
            1. Information We Collect
          </h2>
          <p className="mb-3">
            When you create an account, we collect your email address and, optionally, your phone number for notification purposes. We also store your alert preferences (courses, dates, time windows, group sizes) to provide our tee time monitoring service.
          </p>
          <p>
            We do not collect browsing history, location data, or any information beyond what is necessary to operate the service.
          </p>
        </section>

        <section>
          <h2 className="mb-3 font-[family-name:var(--font-display)] text-lg text-[var(--color-sand-bright)]">
            2. How We Use Your Information
          </h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>To send you tee time alert notifications via email or SMS/iMessage</li>
            <li>To manage your account and subscription</li>
            <li>To improve and maintain the service</li>
            <li>To communicate service updates or changes</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 font-[family-name:var(--font-display)] text-lg text-[var(--color-sand-bright)]">
            3. Data Storage and Security
          </h2>
          <p>
            Your data is stored securely using Supabase (PostgreSQL) with row-level security policies. Authentication is handled via Supabase Auth. We use industry-standard encryption for data in transit (TLS) and at rest. We do not sell, trade, or rent your personal information to third parties.
          </p>
        </section>

        <section>
          <h2 className="mb-3 font-[family-name:var(--font-display)] text-lg text-[var(--color-sand-bright)]">
            4. Third-Party Services
          </h2>
          <p className="mb-3">We use the following third-party services:</p>
          <ul className="list-disc space-y-2 pl-5">
            <li><strong>Supabase</strong> — Authentication and database</li>
            <li><strong>Vercel</strong> — Application hosting</li>
            <li><strong>Upstash</strong> — Task scheduling and rate limiting</li>
            <li><strong>PostHog</strong> — Product analytics (pageviews, feature usage)</li>
            <li><strong>Resend</strong> — Transactional email delivery</li>
          </ul>
          <p className="mt-3">
            Each of these services has their own privacy policies governing how they handle data.
          </p>
        </section>

        <section>
          <h2 className="mb-3 font-[family-name:var(--font-display)] text-lg text-[var(--color-sand-bright)]">
            5. Cookies
          </h2>
          <p>
            We use essential cookies for authentication and session management. We also use PostHog for product analytics, which may store data in your browser to understand usage patterns. We do not sell this data or use it for advertising.
          </p>
        </section>

        <section>
          <h2 className="mb-3 font-[family-name:var(--font-display)] text-lg text-[var(--color-sand-bright)]">
            6. Your Rights
          </h2>
          <p className="mb-3">You have the right to:</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>Access the personal data we hold about you</li>
            <li>Request correction of inaccurate data</li>
            <li>Request deletion of your account and all associated data</li>
            <li>Opt out of notifications at any time by disabling alerts</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 font-[family-name:var(--font-display)] text-lg text-[var(--color-sand-bright)]">
            7. Data Retention
          </h2>
          <p>
            We retain your account data for as long as your account is active. If you delete your account, all personal data and alert configurations are permanently removed within 30 days.
          </p>
        </section>

        <section>
          <h2 className="mb-3 font-[family-name:var(--font-display)] text-lg text-[var(--color-sand-bright)]">
            8. Changes to This Policy
          </h2>
          <p>
            We may update this privacy policy from time to time. We will notify users of any material changes via email or an in-app notice.
          </p>
        </section>

        <section>
          <h2 className="mb-3 font-[family-name:var(--font-display)] text-lg text-[var(--color-sand-bright)]">
            9. Contact
          </h2>
          <p>
            If you have questions about this privacy policy, please contact us at{" "}
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
