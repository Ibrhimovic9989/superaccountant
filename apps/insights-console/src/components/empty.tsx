export function Empty({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center rounded-lg border border-dashed border-white/10 bg-white/[0.01] py-6">
      <p className="font-mono text-[10px] uppercase tracking-wider text-white/40">{text}</p>
    </div>
  )
}
