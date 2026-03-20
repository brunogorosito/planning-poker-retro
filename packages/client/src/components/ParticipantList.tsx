import type { Participant, Vote } from "../../../server/src/types";

interface Props {
  participants: Participant[];
  revealed: boolean;
  votes: Vote[];
}

function roleBadge(role: Participant["role"]) {
  if (role === "Dev") return "bg-blue-50 text-blue-600 border-blue-200";
  if (role === "QA") return "bg-green-50 text-green-600 border-green-200";
  return "bg-gray-100 text-gray-500 border-gray-200";
}

export function ParticipantList({ participants, revealed, votes }: Props) {
  const voteMap = new Map(votes.map((v) => [v.participantName, v.value]));

  return (
    <ul className="space-y-2">
      {participants.map((p) => {
        const voteValue = voteMap.get(p.name);
        return (
          <li
            key={p.name}
            className="flex items-center justify-between px-4 py-2.5 bg-white rounded-lg border border-[#ededed]"
          >
            <span className="flex items-center gap-2 font-medium text-[#32373c] text-sm min-w-0">
              <span className="truncate">{p.name}</span>
              <span className={`text-xs border px-1.5 py-0.5 rounded font-semibold shrink-0 ${roleBadge(p.role)}`}>
                {p.role}
              </span>
              {p.isModerator && (
                <span className="text-xs bg-[#fff0e8] text-[#ff7427] px-2 py-0.5 rounded font-semibold shrink-0">
                  Mod
                </span>
              )}
            </span>

            {revealed && voteValue !== undefined ? (
              <span className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#ff7427] text-white font-bold text-base shrink-0">
                {voteValue}
              </span>
            ) : (
              <span
                className={[
                  "w-9 h-9 flex items-center justify-center rounded-lg text-sm font-semibold border shrink-0",
                  p.hasVoted
                    ? "bg-[#fff0e8] text-[#ff7427] border-[#ffd4b3]"
                    : "bg-[#f5f5f5] text-gray-400 border-[#ededed]",
                ].join(" ")}
              >
                {p.hasVoted ? "✓" : "–"}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
