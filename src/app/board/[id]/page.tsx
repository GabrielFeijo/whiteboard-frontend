import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import BoardStudioLoading from "@/app/board/[id]/loading";
import { BoardStudio } from "@/features/studio/components/board-studio";
import { getCurrentUser } from "@/server/auth/session";
import { getBoardDetailServer } from "@/server/dal/boards.dal";

interface BoardStudioPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
}

async function BoardStudioServerLoader({
  params,
  searchParams,
}: BoardStudioPageProps) {
  await connection();
  const [{ id }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);
  const linkToken = resolvedSearchParams.token || undefined;

  const [user, boardResult] = await Promise.all([
    getCurrentUser(),
    getBoardDetailServer(id, linkToken),
  ]);

  if (!user && !linkToken) {
    redirect("/login");
  }

  const initialBoard = boardResult.ok ? boardResult.data : null;

  return (
    <BoardStudio
      boardId={id}
      initialBoard={initialBoard}
      user={user}
      linkToken={linkToken}
    />
  );
}

export default function BoardStudioPage(props: BoardStudioPageProps) {
  return (
    <Suspense fallback={<BoardStudioLoading />}>
      <BoardStudioServerLoader {...props} />
    </Suspense>
  );
}
