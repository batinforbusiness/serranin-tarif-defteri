export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="soft-card rounded-3xl p-6 text-center">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-cocoa/70">{description}</p>
    </div>
  );
}
