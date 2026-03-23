import { getBoards } from "@/lib/actions";
import { BoardShell } from "@/components/kanban/board-shell";
import type { BoardWithColumns } from "@/lib/types";

export default async function Home() {
  let boards: BoardWithColumns[];
  try {
    boards = await getBoards();
  } catch {
    boards = [];
  }

  return <BoardShell initialBoards={boards} />;
}
