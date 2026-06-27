import Link from "next/link";
import Image from "next/image";
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
    image: {
      src: "/brand/landing-personal-wallet.png",
      alt: "Personal wallet feature",
      position: "58% 62%",
    },
  },
  {
    id: "crypto",
    title: "Crypto Trading",
    desc: "Buy, sell and hold BTC and other top cryptocurrencies.",
    image: {
      src: "/brand/landing-crypto-trading.png",
      alt: "Crypto trading feature",
      position: "60% 62%",
    },
  },
  {
    id: "cards",
    title: "KASHBOY Cards",
    desc: "Spend with purpose with our NGHT, GO EAT and BTC cards.",
    image: {
      src: "/brand/landing-kashboy-cards.png",
      alt: "KASHBOY cards feature",
      position: "58% 62%",
    },
  },
  {
    id: "business",
    title: "Business Payments",
    desc: "Accept payments, manage invoices and grow your business.",
    image: {
      src: "/brand/landing-business-payments.png",
      alt: "Business payments feature",
      position: "58% 62%",
    },
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

function HeroDevices() {
  return (
    <div className="relative mx-auto w-full max-w-[820px]">
      <div className="absolute -inset-10 rounded-[44px] bg-emerald-500/10 blur-3xl" />
      <div className="absolute -inset-6 rounded-[38px] bg-[#070B1A]/85 blur-2xl" />
      <div className="absolute inset-x-12 bottom-4 h-24 rounded-full bg-black/45 blur-2xl" />

      <div
        className="relative aspect-[16/10] overflow-hidden rounded-[28px]"
        style={{
          WebkitMaskImage:
            "linear-gradient(to right, transparent 0%, black 8%, black 94%, transparent 100%), linear-gradient(to bottom, transparent 0%, black 7%, black 88%, transparent 100%)",
          WebkitMaskComposite: "source-in",
          maskImage:
            "linear-gradient(to right, transparent 0%, black 8%, black 94%, transparent 100%), linear-gradient(to bottom, transparent 0%, black 7%, black 88%, transparent 100%)",
          maskComposite: "intersect",
        }}
      >
        <Image
          src="/brand/Image%20Jun%2025.png"
          alt="Kashboy web dashboard and mobile app"
          fill
          priority
          sizes="(max-width: 768px) 92vw, 58vw"
          className="object-contain drop-shadow-[0_32px_55px_rgba(0,0,0,0.45)]"
        />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_74%_16%,rgba(16,185,129,0.16),transparent_32%)]" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#070B1A]/55 via-transparent to-[#070B1A]/28" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#070B1A]/28 via-transparent to-[#070B1A]/62" />
      </div>
    </div>
  );
}

function FeatureVisual({ image }: { image: { src: string; alt: string; position: string } }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <Image
        src={image.src}
        alt={image.alt}
        fill
        sizes="(max-width: 768px) 92vw, (max-width: 1280px) 45vw, 25vw"
        className="object-cover opacity-90 transition-transform duration-500 group-hover:scale-[1.04]"
        style={{ objectPosition: image.position }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#070B1A]/90 via-[#070B1A]/50 to-[#070B1A]/10" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#070B1A]/40 via-transparent to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-emerald-400/20 via-emerald-400/[0.04] to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_78%,rgba(16,185,129,0.18),transparent_42%)]" />
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
            <HeroDevices />
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

        <section id="products" className="relative z-10 mx-auto max-w-[1500px] px-5 py-10 lg:px-10">
          <div className="text-center">
            <h2 className="text-3xl font-black leading-[1.12] tracking-normal text-white sm:text-[34px]">
              Everything You Need
              <br />
              In <span className="text-emerald-400">One Platform</span>
            </h2>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {featureCards.map((card) => (
              <article
                key={card.title}
                id={card.id}
                className="group relative min-h-[258px] overflow-hidden rounded-[18px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(15,23,42,0.48),rgba(2,8,18,0.72))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_18px_55px_rgba(0,0,0,0.22)] transition-all duration-300 hover:-translate-y-1 hover:border-emerald-300/30 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_24px_70px_rgba(0,0,0,0.3),0_0_42px_rgba(16,185,129,0.12)]"
              >
                <div className="relative z-10">
                  <h3 className="text-xl font-black tracking-normal text-white">{card.title}</h3>
                  <p className="mt-4 max-w-[215px] text-[13px] leading-6 text-slate-300">{card.desc}</p>
                  <a
                    href={`#${card.id}`}
                    className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-emerald-400 transition-colors group-hover:text-emerald-300"
                  >
                    Explore <span aria-hidden="true">&rarr;</span>
                  </a>
                </div>
                <FeatureVisual image={card.image} />
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
