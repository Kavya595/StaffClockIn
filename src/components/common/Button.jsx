export default function Button({
  children,
  variant = "primary",
  size = "md",
  icon: Icon,
  className = "",
  type = "button",
  ...props
}) {
  const base =
    "inline-flex items-center justify-center gap-2 font-medium font-body rounded-card transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap active:scale-[0.97]";
  const sizes = {
    sm: "text-xs px-3 py-1.5",
    md: "text-sm px-4 py-2.5",
    lg: "text-base px-5 py-3",
    icon: "p-2",
  };
  const variants = {
    primary: "bg-ink text-paper hover:bg-ink-700 shadow-card",
    accent: "bg-gradient-accent text-white hover:shadow-glow shadow-glow-sm",
    outline: "border border-ink-200 text-ink hover:bg-ink-50 hover:border-ink-300 bg-white",
    ghost: "text-ink-500 hover:bg-ink-100 hover:text-ink",
    danger: "bg-rust text-paper hover:opacity-90",
    subtle: "bg-ink-50 text-ink-600 hover:bg-ink-100",
  };
  return (
    <button type={type} className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props}>
      {Icon && <Icon size={size === "sm" ? 14 : 16} />}
      {children}
    </button>
  );
}
