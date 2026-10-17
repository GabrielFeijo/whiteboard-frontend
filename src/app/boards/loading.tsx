export default function BoardsLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas text-sm text-text-muted">
      <div className="flex flex-col items-center gap-3">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-accent-primary border-t-transparent" />
      </div>
    </div>
  );
}
