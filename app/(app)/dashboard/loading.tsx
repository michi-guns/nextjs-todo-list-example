export default function DashboardLoading() {
  return (
    <main
      className="min-h-svh bg-background p-4 sm:p-6 lg:p-10"
      aria-busy="true"
    >
      <div className="mx-auto grid max-w-4xl gap-4">
        <p className="text-sm text-muted-foreground" role="status">
          Loading your workspace…
        </p>
        <div className="h-12 animate-pulse rounded-xl bg-muted" />
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
      </div>
    </main>
  )
}
