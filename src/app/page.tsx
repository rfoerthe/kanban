import { getBoards } from "@/lib/actions";
import { BoardShell } from "@/components/kanban/board-shell";

export default async function Home() {
  const boards = await getBoards();

  return <BoardShell initialBoards={boards} />;
}
