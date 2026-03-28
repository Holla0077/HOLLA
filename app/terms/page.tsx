import Link from "next/link";

export const metadata = {
  title: "Terms of Service — Holla by KashBoy",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#070B1A] text-white px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <Link href="/signup" className="text-sm text-white/40 hover:text-white transition-colors">← Back</Link>
        </div>

        <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
        <p className="text-white/40 text-sm mb-8">Effective date: March 2026 · Holla by KashBoy</p>

        <div className="prose prose-invert max-w-none space-y-6 text-white/75 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-white mb-2">1. Acceptance of Terms</h2>
            <p>By creating an account or using the Holla platform (the "Service"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">2. Eligibility</h2>
            <p>You must be at least 18 years old and a resident of Ghana to use Holla. By registering, you confirm that you meet these requirements. Corporate and institutional accounts are subject to separate agreements.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">3. Account Verification (KYC)</h2>
            <p>In compliance with the Bank of Ghana and applicable anti-money laundering (AML) regulations, we are required to verify your identity before activating transaction privileges. You agree to submit accurate identification documents when requested. Failure to complete verification will limit your account functionality.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">4. Permitted Use</h2>
            <p>You may use Holla solely for lawful personal financial transactions. You agree not to:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Use the Service for money laundering, fraud, or any illegal activity</li>
              <li>Create multiple accounts to circumvent limits or restrictions</li>
              <li>Attempt to hack, reverse-engineer, or disrupt the platform</li>
              <li>Use the Service on behalf of a sanctioned individual or entity</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">5. Wallets and Balances</h2>
            <p>Your Holla wallet holds digital balances on your behalf. Holla is not a bank and your wallet balance is not a bank deposit. We do not pay interest on wallet balances. Fiat balances are denominated in Ghana Cedis (GHS). Cryptocurrency balances are subject to market volatility — Holla is not liable for changes in market value.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">6. Fees</h2>
            <p>Holla may charge fees for certain transactions. All applicable fees will be disclosed before you confirm a transaction. Fees are non-refundable unless otherwise stated.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">7. Reversals and Refunds</h2>
            <p>Completed transactions are generally irreversible. If you believe a transaction was made in error or as a result of fraud, contact our support team immediately. We will investigate and respond within 5 business days. We reserve the right to freeze accounts under investigation.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">8. Account Security</h2>
            <p>You are responsible for maintaining the confidentiality of your login credentials. You agree to notify us immediately if you suspect unauthorised access to your account. Holla is not liable for losses arising from unauthorised access resulting from your failure to safeguard your credentials.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">9. Suspension and Termination</h2>
            <p>Holla reserves the right to suspend or terminate your account at any time for violation of these Terms, suspected fraud, regulatory requirements, or any other reason at our sole discretion. We will provide notice where legally required.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">10. Limitation of Liability</h2>
            <p>To the fullest extent permitted by Ghanaian law, Holla and its operators shall not be liable for indirect, incidental, special, or consequential damages arising from your use of the Service.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">11. Governing Law</h2>
            <p>These Terms are governed by the laws of the Republic of Ghana. Any disputes shall be resolved in the courts of Ghana.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">12. Changes to Terms</h2>
            <p>We may update these Terms from time to time. We will notify you via the app or email. Continued use of the Service after any change constitutes your acceptance of the updated Terms.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">13. Contact</h2>
            <p>For questions about these Terms, contact us at <a href="mailto:legal@holla.app" className="text-emerald-400 underline">legal@holla.app</a>.</p>
          </section>
        </div>

        <div className="mt-10 pt-6 border-t border-white/10 flex gap-4 text-xs text-white/30">
          <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
          <span>·</span>
          <span>© 2026 KashBoy / Holla. All rights reserved.</span>
        </div>
      </div>
    </main>
  );
}
