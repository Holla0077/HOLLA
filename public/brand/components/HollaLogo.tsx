type Props = {
  variant?: "full" | "icon";
  className?: string;
};

export default function HollaLogo({ variant = "full", className }: Props) {
  return (
    <div className={`flex items-center gap-3 ${className ?? ""}`}>
      <img
        src="/brand/holla-logo-transparent.png"
        alt="HOLLA"
        className="h-12 w-auto"
      />

      {variant === "full" && (
        <span className="text-white font-semibold tracking-wide">
          HOLLA
        </span>
      )}
    </div>
  );
}
