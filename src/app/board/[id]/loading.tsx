export default function BoardStudioLoading() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-canvas">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-primary border-t-transparent" />
      </div>
    </div>
  );
}
