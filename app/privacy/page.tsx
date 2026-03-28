import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — Holla by KashBoy",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#070B1A] text-white px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <Link href="/signup" className="text-sm text-white/40 hover:text-white transition-colors">← Back</Link>
        </div>

        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-white/40 text-sm mb-8">Effective date: March 2026 · Holla by KashBoy</p>

        <div className="prose prose-invert max-w-none space-y-6 text-white/75 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-white mb-2">1. Information We Collect</h2>
            <p>When you use Holla, we collect:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong>Account information:</strong> username, email address, phone number, full name, date of birth, gender</li>
              <li><strong>Identity documents:</strong> submitted during KYC verification (Ghana Card, passport, etc.)</li>
              <li><strong>Transaction data:</strong> amounts, dates, counterparties, methods, and status of every transaction</li>
              <li><strong>Device and usage data:</strong> IP address, browser type, session timestamps</li>
              <li><strong>Support communications:</strong> messages you send to our support team</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">2. How We Use Your Information</h2>
            <p>We use your information to:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Provide, operate, and improve the Holla Service</li>
              <li>Verify your identity and comply with KYC/AML obligations</li>
              <li>Process and record financial transactions</li>
              <li>Detect and prevent fraud, money laundering, and abuse</li>
              <li>Communicate with you about your account, transactions, and updates</li>
              <li>Comply with legal obligations and respond to lawful requests from regulators</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">3. Sharing Your Information</h2>
            <p>We do not sell your personal data. We may share it with:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong>Payment processors:</strong> to execute your top-ups and withdrawals (e.g., Paystack, MoMo providers)</li>
              <li><strong>KYC/identity verification partners:</strong> as required by law</li>
              <li><strong>Regulators and law enforcement:</strong> when legally required (e.g., Bank of Ghana, Financial Intelligence Centre)</li>
              <li><strong>Service providers:</strong> infrastructure and hosting providers bound by confidentiality obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">4. Data Security</h2>
            <p>We protect your data using industry-standard security measures including encrypted storage, HTTPS for all communications, and strict access controls. Your password is hashed using bcrypt and is never stored in plaintext. However, no system is completely secure — you are responsible for keeping your login credentials confidential.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">5. Data Retention</h2>
            <p>We retain your account data for as long as your account is active and for a minimum of 7 years after closure, as required by Ghanaian financial regulations. Transaction records are retained for the statutory period required by applicable law.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">6. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Access the personal data we hold about you</li>
              <li>Correct inaccurate information in your profile</li>
              <li>Request deletion of your account (subject to regulatory retention requirements)</li>
              <li>Object to certain uses of your data</li>
            </ul>
            <p className="mt-2">To exercise these rights, contact us at <a href="mailto:privacy@holla.app" className="text-emerald-400 underline">privacy@holla.app</a>.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">7. Cookies</h2>
            <p>We use a single, essential session cookie to keep you logged in. We do not use third-party tracking or advertising cookies.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">8. Children</h2>
            <p>Holla is not intended for anyone under 18 years of age. We do not knowingly collect data from minors.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">9. Changes to this Policy</h2>
            <p>We may update this Privacy Policy from time to time. We will notify you through the app or by email. Your continued use of the Service constitutes acceptance of the updated policy.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">10. Contact</h2>
            <p>For privacy-related enquiries: <a href="mailto:privacy@holla.app" className="text-emerald-400 underline">privacy@holla.app</a></p>
          </section>
        </div>

        <div className="mt-10 pt-6 border-t border-white/10 flex gap-4 text-xs text-white/30">
          <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
          <span>·</span>
          <span>© 2026 KashBoy / Holla. All rights reserved.</span>
        </div>
      </div>
    </main>
  );
}
