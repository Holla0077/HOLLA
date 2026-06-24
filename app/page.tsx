import Link from "next/link";
import HollaLogo from "@/public/brand/components/HollaLogo";

const navItems = ["Personal", "Business", "Crypto", "Cards", "Company", "Help"];

const trustBadges = [
  { label: "Secure & Encrypted", icon: "S", accent: "emerald" },
  { label: "MoMo Integrated", icon: "M", accent: "yellow" },
  { label: "Crypto Enabled", icon: "B", accent: "yellow" },
  { label: "Fast Withdrawals", icon: "W", accent: "emerald" },
  { label: "24/7 Support", icon: "24", accent: "emerald" },
];

const featureCards = [
  {
    id: "personal",
    title: "Personal Wallet",
    desc: "Send and receive money instantly with anyone, anywhere.",
    visual: "wallet",
  },
  {
    id: "crypto",
    title: "Crypto Trading",
    desc: "Buy, sell and hold BTC and other top cryptocurrencies.",
    visual: "crypto",
  },
  {
    id: "cards",
    title: "KASHBOY Cards",
    desc: "Spend with purpose with our NGHT, GO EAT and BTC cards.",
    visual: "card",
  },
  {
    id: "business",
    title: "Business Payments",
    desc: "Accept payments, manage invoices and grow your business.",
    visual: "business",
  },
];

const steps = [
  { num: "1", title: "Create Account", desc: "Sign up in minutes and verify your identity." },
  { num: "2", title: "Fund Your Wallet", desc: "Top up via MoMo, bank transfer or crypto." },
  { num: "3", title: "Move Money", desc: "Send, receive, pay or buy crypto instantly." },
  { num: "4", title: "Enjoy Freedom", desc: "Access financial services built for Africa." },
];

const footerLinks = [
  { title: "Products", links: ["Personal", "Business", "Crypto", "Cards"] },
  { title: "Company", links: ["About Us", "Careers", "Press", "Blog"] },
  { title: "Support", links: ["Help Center", "Contact Us", "Security", "Status"] },
  { title: "Legal", links: ["Terms of Use", "Privacy Policy", "Compliance"] },
];

function LogoMark({ footer = false }: { footer?: boolean }) {
  if (footer) {
    return (
      <div className="scale-[2.5]">
        <HollaLogo variant="icon" />
      </div>
    );
  }

  return (
    <div className="scale-[4]">
      <HollaLogo variant="icon" />
    </div>
  );
}

function TrustIcon({ icon, accent }: { icon: string; accent: string }) {
  const color =
    accent === "yellow"
      ? "border-yellow-400/40 bg-yellow-400/10 text-yellow-300 shadow-[0_0_24px_rgba(250,204,21,0.18)]"
      : "border-emerald-400/40 bg-emerald-400/10 text-emerald-300 shadow-[0_0_24px_rgba(16,185,129,0.18)]";

  return (
    <span className={`flex h-8 w-8 items-center justify-center rounded-full border text-[10px] font-black ${color}`}>
      {icon}
    </span>
  );
}

function MiniLineChart() {
  return (
    <svg viewBox="0 0 250 95" className="h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="heroChartFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#10f29b" stopOpacity="0.42" />
          <stop offset="100%" stopColor="#10f29b" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M8 75 C 25 66, 38 63, 53 52 C 69 41, 82 52, 98 45 C 113 39, 123 25, 139 32 C 154 39, 163 54, 179 43 C 197 31, 210 18, 240 12"
        fill="none"
        stroke="#10f29b"
        strokeLinecap="round"
        strokeWidth="4"
      />
      <path
        d="M8 75 C 25 66, 38 63, 53 52 C 69 41, 82 52, 98 45 C 113 39, 123 25, 139 32 C 154 39, 163 54, 179 43 C 197 31, 210 18, 240 12 L 240 95 L 8 95 Z"
        fill="url(#heroChartFill)"
      />
    </svg>
  );
}

function PhoneMockup() {
  return (
    <div className="absolute bottom-2 left-0 z-20 h-[242px] w-[138px] rotate-[-1deg] rounded-[24px] border border-white/35 bg-[#050b12] p-2 shadow-[0_28px_70px_rgba(0,0,0,0.65)] sm:left-8 lg:bottom-6">
      <div className="h-full overflow-hidden rounded-[18px] border border-emerald-400/10 bg-[#07121c] p-3">
        <div className="mb-3 flex items-center justify-between">
          <div className="h-2 w-14 rounded-full bg-emerald-400" />
          <div className="h-4 w-4 rounded-full bg-emerald-400/30" />
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
          <p className="text-[8px] font-semibold text-slate-400">Total Balance</p>
          <div className="mt-1 h-3 w-20 rounded bg-white/75" />
          <div className="mt-2 h-2 w-14 rounded bg-emerald-400/80" />
        </div>

        <div className="mt-4 space-y-3">
          {[
            ["B", "Bitcoin"],
            ["E", "Ethereum"],
            ["U", "USDT"],
          ].map(([short, name]) => (
            <div key={name} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-400/15 text-[10px] font-bold text-emerald-300">
                  {short}
                </span>
                <div>
                  <div className="h-2 w-10 rounded bg-white/30" />
                  <div className="mt-1 h-1.5 w-7 rounded bg-white/10" />
                </div>
              </div>
              <div className="h-2 w-6 rounded bg-emerald-300/70" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LaptopMockup() {
  return (
    <div className="relative mx-auto h-[300px] w-full max-w-[640px]">
      <div className="absolute inset-x-8 bottom-6 h-28 rounded-full bg-emerald-400/10 blur-3xl" />
      <div className="absolute right-4 top-0 h-[250px] w-[470px] max-w-[82vw] rotate-[-5deg] rounded-[20px] border border-white/35 bg-[#080d17] p-3 shadow-[0_30px_90px_rgba(0,0,0,0.7)]">
        <div className="flex h-full overflow-hidden rounded-[14px] border border-white/10 bg-[#07111b]">
          <aside className="w-20 border-r border-white/10 bg-black/25 p-3">
            <div className="mb-5 h-2 w-10 rounded-full bg-emerald-400" />
            {["Dashboard", "Wallet", "Cards", "Crypto", "More"].map((item, index) => (
              <div key={item} className="mb-4 flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${index === 0 ? "bg-emerald-400" : "bg-white/15"}`} />
                <span className="h-2 flex-1 rounded bg-white/10" />
              </div>
            ))}
          </aside>

          <div className="flex-1 p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="h-3 w-28 rounded bg-white/75" />
                <div className="mt-2 h-2 w-20 rounded bg-white/15" />
              </div>
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-emerald-400/20" />
                <div className="h-6 w-16 rounded-full bg-white/10" />
              </div>
            </div>

            <div className="grid grid-cols-[1.2fr_1fr_1fr] gap-3">
              <div className="row-span-2 rounded-xl border border-emerald-400/15 bg-emerald-400/[0.06] p-4">
                <div className="mb-2 h-2 w-16 rounded bg-white/20" />
                <div className="h-4 w-24 rounded bg-white/70" />
                <div className="mt-3 h-24">
                  <MiniLineChart />
                </div>
              </div>
              {["GHS", "Crypto", "Cards", "Rewards"].map((item, index) => (
                <div key={item} className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                  <div className="mb-3 h-2 w-12 rounded bg-white/20" />
                  <div className={`h-3 rounded ${index === 3 ? "w-16 bg-emerald-300/80" : "w-20 bg-white/65"}`} />
                  <div className="mt-3 h-2 w-10 rounded bg-emerald-400/40" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="absolute bottom-0 right-2 h-8 w-[500px] max-w-[86vw] rotate-[-5deg] rounded-b-[32px] bg-gradient-to-r from-slate-900 via-slate-300 to-slate-800 shadow-[0_18px_50px_rgba(0,0,0,0.6)]" />
      <PhoneMockup />
    </div>
  );
}

function FeatureVisual({ type }: { type: string }) {
  if (type === "crypto") {
    return (
      <div className="absolute -bottom-8 right-3 h-36 w-36 rounded-full border border-emerald-200/30 bg-gradient-to-br from-emerald-300/50 via-emerald-700/50 to-emerald-950 shadow-[0_0_45px_rgba(16,185,129,0.28)]">
        <div className="absolute inset-4 rounded-full border border-emerald-100/30" />
        <span className="absolute inset-0 flex items-center justify-center text-6xl font-black text-emerald-100">B</span>
      </div>
    );
  }

  if (type === "card") {
    return (
      <div className="absolute -bottom-4 right-2 h-28 w-44 rotate-[-15deg] rounded-2xl border border-emerald-200/35 bg-gradient-to-br from-emerald-400/35 via-emerald-800 to-[#06101a] p-4 shadow-[0_0_45px_rgba(16,185,129,0.22)]">
        <div className="h-7 w-9 rounded-md border border-emerald-100/40 bg-emerald-100/10" />
        <div className="mt-8 h-2 w-24 rounded bg-white/25" />
        <div className="mt-3 flex justify-between">
          <div className="h-2 w-12 rounded bg-white/20" />
          <div className="h-5 w-9 rounded-full border border-emerald-100/35" />
        </div>
      </div>
    );
  }

  if (type === "business") {
    return (
      <div className="absolute -bottom-2 right-1 h-40 w-40">
        <div className="absolute bottom-0 right-5 h-32 w-28 rounded-t-3xl border border-emerald-200/35 bg-gradient-to-b from-emerald-300/45 to-emerald-950 shadow-[0_0_45px_rgba(16,185,129,0.26)]" />
        <div className="absolute bottom-6 right-12 h-16 w-12 rounded-t-xl bg-[#06101a] ring-1 ring-emerald-200/30" />
        <div className="absolute bottom-24 right-16 h-3 w-3 rounded-full bg-emerald-100" />
      </div>
    );
  }

  return (
    <div className="absolute -bottom-8 right-8 h-36 w-24 rotate-[-14deg] rounded-2xl border border-emerald-200/35 bg-gradient-to-br from-emerald-400/35 to-[#06101a] p-4 shadow-[0_0_40px_rgba(16,185,129,0.22)]">
      <div className="h-7 w-7 rounded-lg bg-emerald-100/20 ring-1 ring-emerald-100/40" />
      <div className="mt-12 h-2 w-12 rounded bg-white/20" />
      <div className="mt-2 h-2 w-9 rounded bg-emerald-200/50" />
      <div className="absolute right-[-28px] top-12 flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-200/25 bg-emerald-400/20 text-lg font-black text-emerald-100">
        A
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#070B1A] text-white">
      <div className="relative overflow-hidden bg-[#070B1A]">
        <div className="pointer-events-none absolute left-1/2 top-8 h-[420px] w-[760px] -translate-x-1/2 rounded-full bg-emerald-500/[0.08] blur-[110px]" />

        <header className="relative z-20">
          <div className="mx-auto flex max-w-[1500px] items-center justify-between px-5 py-5 lg:px-10">
            <Link href="/" className="ml-10 flex items-center sm:ml-12">
              <LogoMark />
            </Link>

            <nav className="hidden items-center gap-6 text-xs font-semibold text-slate-300 md:flex lg:gap-9 lg:text-sm">
              {navItems.map((item) => (
                <a key={item} href={`#${item.toLowerCase()}`} className="transition-colors hover:text-emerald-300">
                  {item}
                </a>
              ))}
            </nav>

            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-slate-200 transition-colors hover:border-emerald-300/50 hover:text-white"
              >
                Log In
              </Link>
              <Link
                href="/signup"
                className="rounded-lg bg-emerald-400 px-4 py-2 text-sm font-bold text-[#04130d] shadow-[0_0_24px_rgba(52,211,153,0.25)] transition-colors hover:bg-emerald-300"
              >
                Sign Up
              </Link>
            </div>
          </div>
        </header>

        <section className="relative z-10 mx-auto grid max-w-[1500px] items-center gap-10 px-5 pb-12 pt-12 md:grid-cols-[0.85fr_1.15fr] lg:px-10 lg:pb-16 lg:pt-16">
          <div className="max-w-[600px]">
            <h1 className="text-4xl font-black leading-[1.05] tracking-normal text-white sm:text-5xl">
              Africa&apos;s <span className="text-emerald-400">Modern</span>
              <br />
              <span className="text-emerald-400">Money</span> Platform.
            </h1>
            <p className="mt-6 max-w-[480px] text-base leading-8 text-slate-300 lg:text-lg">
              Send, receive and manage money easily. Buy crypto, pay merchants and enjoy unmatched financial freedom.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/signup"
                className="rounded-xl bg-emerald-400 px-7 py-4 text-base font-bold text-[#04130d] shadow-[0_0_28px_rgba(52,211,153,0.24)] transition-colors hover:bg-emerald-300"
              >
                Get Started
              </Link>
              <a
                href="#products"
                className="rounded-xl border border-white/15 px-7 py-4 text-base font-bold text-slate-200 transition-colors hover:border-emerald-300/50 hover:text-white"
              >
                Learn More
              </a>
            </div>
          </div>

          <div className="relative">
            <div className="absolute right-6 top-0 hidden h-24 w-24 rounded-full border border-emerald-400/15 lg:block" />
            <LaptopMockup />
          </div>
        </section>

        <section className="relative z-10 mx-auto max-w-[1500px] px-5 pb-12 lg:px-10">
          <p className="text-center text-sm font-medium text-slate-400">
            Trusted by thousands of users across Africa
          </p>
          <div className="mt-7 grid gap-4 border-b border-white/10 pb-9 sm:grid-cols-2 md:grid-cols-5">
            {trustBadges.map((badge) => (
              <div key={badge.label} className="flex items-center justify-center gap-3 text-xs font-semibold text-slate-300 xl:text-sm">
                <TrustIcon icon={badge.icon} accent={badge.accent} />
                <span>{badge.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section id="products" className="relative z-10 mx-auto max-w-[1500px] px-5 py-12 lg:px-10">
          <div className="text-center">
            <h2 className="text-3xl font-black leading-tight tracking-normal text-white sm:text-4xl">
              Everything You Need
              <br />
              In <span className="text-emerald-400">One Platform</span>
            </h2>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {featureCards.map((card) => (
              <article
                key={card.title}
                id={card.id}
                className="group relative min-h-[300px] overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02] p-7 shadow-[0_20px_70px_rgba(0,0,0,0.18)] transition-colors hover:border-emerald-300/35 hover:bg-emerald-500/[0.04]"
              >
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-emerald-400/18 to-transparent" />
                <h3 className="text-2xl font-black tracking-normal text-white">{card.title}</h3>
                <p className="mt-6 max-w-[220px] text-sm leading-7 text-slate-300">{card.desc}</p>
                <a
                  href={`#${card.id}`}
                  className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-emerald-400 transition-colors group-hover:text-emerald-300"
                >
                  Explore <span aria-hidden="true">-&gt;</span>
                </a>
                <FeatureVisual type={card.visual} />
              </article>
            ))}
          </div>
        </section>

        <section className="relative z-10 mx-auto max-w-[1500px] px-5 py-16 lg:px-10">
          <h2 className="text-center text-3xl font-black tracking-normal text-white sm:text-4xl">
            How It Works
          </h2>
          <div className="mt-11 grid gap-8 md:grid-cols-4">
            {steps.map((step, index) => (
              <div key={step.num} className="relative text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-400/15 text-2xl font-black text-emerald-300 shadow-[0_0_28px_rgba(16,185,129,0.16)]">
                  {step.num}
                </div>
                {index < steps.length - 1 && (
                  <div className="absolute left-[calc(50%+54px)] top-8 hidden w-[calc(100%-108px)] text-center text-4xl leading-none text-slate-500 md:block">
                    -&gt;
                  </div>
                )}
                <h3 className="mt-7 text-lg font-black tracking-normal text-white">{step.title}</h3>
                <p className="mx-auto mt-3 max-w-[190px] text-sm leading-7 text-slate-400">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="relative z-10 mx-auto max-w-[1500px] px-5 pb-16 lg:px-10">
          <div className="flex flex-col items-center justify-between gap-8 rounded-2xl border border-white/[0.07] bg-white/[0.02] px-8 py-9 shadow-[0_20px_70px_rgba(0,0,0,0.2)] md:flex-row md:px-14">
            <p className="max-w-2xl text-center text-2xl font-semibold leading-10 text-slate-100 md:text-left">
              Join thousands of users enjoying fast, secure and reliable financial services.
            </p>
            <div className="flex shrink-0 flex-wrap justify-center gap-4">
              <Link
                href="/signup"
                className="rounded-xl bg-emerald-400 px-8 py-4 text-base font-bold text-[#04130d] shadow-[0_0_24px_rgba(52,211,153,0.22)] transition-colors hover:bg-emerald-300"
              >
                Get Started
              </Link>
              <a
                href="mailto:sales@kashboy.com"
                className="rounded-xl border border-white/15 px-8 py-4 text-base font-bold text-slate-200 transition-colors hover:border-emerald-300/50 hover:text-white"
              >
                Contact Sales
              </a>
            </div>
          </div>
        </section>
      </div>

      <footer id="company" className="border-t border-white/[0.07] bg-[#070B1A]">
        <div className="mx-auto grid max-w-[1500px] gap-10 px-5 py-14 lg:grid-cols-[1.3fr_2fr] lg:px-10">
          <div>
            <Link href="/" className="inline-flex items-center">
              <LogoMark footer />
            </Link>
            <p className="mt-5 text-sm text-slate-400">Money. Lifestyle. Freedom.</p>
            <div className="mt-8 flex gap-3">
              {["f", "x", "ig", "in"].map((item) => (
                <a
                  key={item}
                  href="#help"
                  aria-label={`${item} social link`}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-xs font-bold text-slate-400 transition-colors hover:border-emerald-300/50 hover:text-emerald-300"
                >
                  {item}
                </a>
              ))}
            </div>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {footerLinks.map((column) => (
              <div key={column.title}>
                <h3 className="text-sm font-black text-white">{column.title}</h3>
                <div className="mt-6 space-y-4">
                  {column.links.map((item) => (
                    <a key={item} href="#products" className="block text-sm text-slate-400 transition-colors hover:text-emerald-300">
                      {item}
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mx-auto max-w-[1500px] border-t border-white/10 px-5 py-7 text-sm text-slate-500 lg:px-10">
          &copy; 2025 KASHBOY. All rights reserved.
        </div>
      </footer>
    </main>
  );
}
