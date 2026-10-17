import { Suspense } from "react";
import BoardsLoading from "@/app/boards/loading";
import { BoardsDashboard } from "@/features/boards/components/boards-dashboard";
import { requireAuth } from "@/server/auth/session";
import { getBoardsServer } from "@/server/dal/boards.dal";

async function BoardsServerLoader() {
  const [user, initialBoards] = await Promise.all([
    requireAuth(),
    getBoardsServer(),
  ]);

  return <BoardsDashboard user={user} initialBoards={initialBoards} />;
}

export default function BoardsPage() {
  return (
    <Suspense fallback={<BoardsLoading />}>
      <BoardsServerLoader />
    </Suspense>
  );
}
