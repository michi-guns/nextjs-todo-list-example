/**
 * Editorial preview banner with an explicit exit. A plain anchor, so nothing
 * prefetches the exit route and turns Draft Mode off by accident.
 */
export function ExitPreview() {
  return (
    <div
      role="region"
      aria-label="Draft preview"
      className="fixed inset-x-0 bottom-4 z-50 mx-auto flex w-fit items-center gap-3 rounded-full border border-border bg-card px-4 py-2 text-sm shadow-md"
    >
      <span className="font-medium">Draft preview</span>
      <a
        href="/api/draft-mode/disable"
        className="text-muted-foreground underline underline-offset-4 hover:text-foreground"
      >
        Exit preview
      </a>
    </div>
  )
}
