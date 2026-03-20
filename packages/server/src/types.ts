// Tipos compartidos entre server y client (importar desde path relativo en el cliente)

export interface Room {
  id: string;
  name: string;
  createdAt: number;
}

export interface Session {
  id: string;
  roomId: string;
  storyName: string;
  jiraKey: string | null;
  storyQueueId: string | null;
  result: string | null;
  devResult: string | null;
  qaResult: string | null;
  createdAt: number;
  revealedAt: number | null;
}

export interface JiraAttachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  url: string;
}

export interface JiraIssue {
  key: string;
  summary: string;
  description: string | null;
  status: string;
  assignee: string | null;
  url: string;
  attachments: JiraAttachment[];
}

export interface Vote {
  id: string;
  sessionId: string;
  participantName: string;
  participantRole: string | null;
  value: string;
  createdAt: number;
}

export type ParticipantRole = "Dev" | "QA" | "Otro";

export interface Participant {
  name: string;
  isModerator: boolean;
  hasVoted: boolean;
  role: ParticipantRole;
}

export interface PlannedStory {
  id: string;
  storyName: string;
  jiraKey?: string;
  isVoted?: boolean;
}

export interface RoomState {
  room: Room;
  participants: Participant[];
  currentSession: Session | null;
  /** Solo presente si la sesión fue revelada */
  votes: Vote[];
  average: number | null;
  storyQueue: PlannedStory[];
}

// Payloads cliente → servidor
export interface JoinRoomPayload {
  roomId: string;
  name: string;
  email: string;
  isModerator: boolean;
  role: ParticipantRole;
}

export interface AddToQueuePayload {
  roomId: string;
  storyName: string;
  jiraKey?: string;
}

export interface RemoveFromQueuePayload {
  roomId: string;
  storyId: string;
}

export interface StartFromQueuePayload {
  roomId: string;
  storyId: string;
}

export interface VotePayload {
  sessionId: string;
  value: string;
}

export interface RevealVotesPayload {
  sessionId: string;
}

export interface SaveResultPayload {
  sessionId: string;
  result: string;
  devResult: string;
  qaResult: string;
}

export interface NewRoundPayload {
  roomId: string;
  storyName: string;
  jiraKey?: string;
}

export type RetroPhase = "waiting" | "writing" | "revealed" | "voting" | "closed";

export interface Retro {
  id: string;
  title: string;
  facilitatorEmail: string;
  roomId: string | null;
  timerSeconds: number;
  writingEndsAt: number | null;
  phase: RetroPhase;
  votesPerPerson: number;
  createdAt: number;
}

export interface RetroColumn {
  id: string;
  retroId: string;
  title: string;
  emoji: string | null;
  position: number;
}

export interface RetroItem {
  id: string;
  retroId: string;
  columnId: string;
  content: string;
  votes: number;
  createdAt: number;
}

export interface RetroParticipant {
  name: string;
  email: string;
  isFacilitator: boolean;
  cardCount: number;
}

export interface RetroState {
  retro: Retro;
  columns: RetroColumn[];
  participants: RetroParticipant[];
  myCards: RetroItem[];
  allCards: RetroItem[];
  myVotesLeft: number;
}

export interface JoinRetroPayload {
  retroId: string;
  name: string;
  email: string;
}

export interface AddCardPayload {
  retroId: string;
  columnId: string;
  content: string;
}

export interface EditCardPayload {
  retroId: string;
  cardId: string;
  content: string;
}

export interface DeleteCardPayload {
  retroId: string;
  cardId: string;
}

export interface VoteCardPayload {
  retroId: string;
  cardId: string;
}

export interface CreateRetroPayload {
  title: string;
  timerSeconds: number;
  votesPerPerson: number;
  facilitatorEmail: string;
  roomId?: string;
  columns: { title: string; emoji?: string }[];
}
