export default function Card({ children, className = "", hover = false, as: Tag = "div", ...props }) {
  return (
    <Tag
      className={`bg-white border border-ink-100 rounded-card shadow-card ${hover ? "card-hover" : ""} ${className}`}
      {...props}
    >
      {children}
    </Tag>
  );
}
