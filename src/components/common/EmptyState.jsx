export default function EmptyState({ icon: Icon, title, message, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6">
      {Icon && (
        <div className="w-12 h-12 rounded-full bg-brass-50 flex items-center justify-center mb-4">
          <Icon size={22} className="text-brass-400" />
        </div>
      )}
      <h3 className="font-display font-semibold text-ink text-sm mb-1">{title}</h3>
      {message && <p className="text-sm text-ink-400 max-w-xs mb-4">{message}</p>}
      {action}
    </div>
  );
}
