/** The participant page for the Stage 4 group session permission (CORR-007 CR-30). One question; the answers are handled by GroupParticipationPermission. */
import { useParams } from "react-router-dom";
import GroupParticipationPermission from "./GroupParticipationPermission";

export default function Stage4Permission() {
  const { groupSessionId } = useParams<{ groupSessionId: string }>();
  if (!groupSessionId) return null;
  return (
    <div className="space-y-4 max-w-2xl" data-testid="stage4-permission-page">
      <h1 className="text-xl font-semibold">Group session</h1>
      <GroupParticipationPermission groupSessionId={groupSessionId} />
    </div>
  );
}
