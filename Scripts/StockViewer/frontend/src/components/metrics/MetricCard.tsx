interface MetricCardProps {
  label: string;
  value: string;
}

export function MetricCard({ label, value }: MetricCardProps) {
  return (
    <div className="flex flex-col gap-0.5 px-3 py-2 border-b border-[#1e1e1e]">
      <span className="text-[#64748b] text-[10px] uppercase tracking-wider">{label}</span>
      <span className="text-[#e2e8f0] text-xs font-medium">{value}</span>
    </div>
  );
}
