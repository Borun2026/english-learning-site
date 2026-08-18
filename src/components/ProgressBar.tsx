export default function ProgressBar({ value }: { value: number }) {
  return (
    <div className="pbar">
      <div className="pbar-fill" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  )
}
