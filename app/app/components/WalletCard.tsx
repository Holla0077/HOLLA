"use client";

export function formatWalletBalance(code: string, balance: string): string {
  if (code === "GHS" || code === "GH₵") {
    try {
      const n = BigInt(balance || "0");
      const sign = n < 0n ? "-" : "";
      const abs = n < 0n ? -n : n;
      const whole = (abs / 100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      const frac = (abs % 100n).toString().padStart(2, "0");
      return `${sign}GH₵ ${whole}.${frac}`;
    } catch {
      return "GH₵ 0.00";
    }
  }
  return balance;
}

export const ASSET_WATERMARK: Record<string, string> = {
  GHS: "₵",
  BTC: "₿",
  LTC: "Ł",
  ETH: "Ξ",
  DASH: "Đ",
  BCH: "Ƀ",
  USDT_ERC20: "₮",
  USDC_ERC20: "$",
};

export const walletCardGlass =
  "rounded-[22px] border border-slate-200/15 bg-slate-950/10 backdrop-blur-sm shadow-[0_0_0_1px_rgba(255,255,255,0.02)]";

export const walletCardActiveClass =
  "border-emerald-500/40 bg-slate-950/20 shadow-[0_0_32px_rgba(16,185,129,0.18)]";

export const walletCardInactiveClass =
  "hover:border-slate-200/25";

type WalletCardProps = {
  name: string;
  code: string;
  formattedBalance: string;
  active?: boolean;
  onClick?: () => void;
};

export function WalletCard({
  name,
  code,
  formattedBalance,
  active = false,
  onClick,
}: WalletCardProps) {
  const mark = ASSET_WATERMARK[code] ?? "₿";

  return (
    <button
      type="button"
      onClick={onClick}
      style={{ padding: "20px 24px" }}
      className={[
        "relative min-w-[340px] overflow-hidden text-left transition-all",
        walletCardGlass,
        active ? walletCardActiveClass : walletCardInactiveClass,
      ].join(" ")}
    >
      <div className="pointer-events-none absolute right-5 bottom-3 text-[88px] font-black text-white/5 leading-none select-none">
        {mark}
      </div>

      <div className="flex items-center justify-between">
        <div className="text-[13px] font-semibold text-white/90">{name}</div>
        <div className="rounded-full border border-slate-200/40 px-3 py-1 text-[12px] text-white/90">
          {code}
        </div>
      </div>

      <div className="mt-5 text-[44px] font-semibold text-white leading-none">
        {formattedBalance}
      </div>
      <div className="mt-2 text-[13px] text-white/65">Available Balance</div>
    </button>
  );
}
