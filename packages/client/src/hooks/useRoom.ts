import { useEffect, useReducer } from "react";
import { socket } from "../socket";
import { SERVER_EVENTS, CLIENT_EVENTS } from "../../../server/src/events";
import type {
  RoomState,
  Participant,
  Session,
  Vote,
  PlannedStory,
  JoinRoomPayload,
} from "../../../server/src/types";

interface State {
  connected: boolean;
  roomState: RoomState | null;
  error: string | null;
}

type Action =
  | { type: "connected" }
  | { type: "disconnected" }
  | { type: "room_state"; payload: RoomState }
  | { type: "participant_joined"; payload: { name: string; role: string } }
  | { type: "participant_left"; payload: { name: string } }
  | { type: "vote_cast"; payload: { name: string; hasVoted: boolean } }
  | { type: "votes_revealed"; payload: { votes: Vote[]; average: number | null } }
  | { type: "result_saved"; payload: { sessionId: string; result: string } }
  | { type: "round_started"; payload: { session: Session } }
  | { type: "queue_updated"; payload: { queue: PlannedStory[] } }
  | { type: "error"; payload: { message: string } };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "connected":
      return { ...state, connected: true, error: null };
    case "disconnected":
      return { ...state, connected: false };
    case "room_state":
      return { ...state, roomState: action.payload };
    case "participant_joined": {
      if (!state.roomState) return state;
      const already = state.roomState.participants.some(
        (p) => p.name === action.payload.name
      );
      if (already) return state;
      const newP: Participant = {
        name: action.payload.name,
        isModerator: false,
        hasVoted: false,
        role: (action.payload.role as Participant["role"]) ?? "Otro",
      };
      return {
        ...state,
        roomState: {
          ...state.roomState,
          participants: [...state.roomState.participants, newP],
        },
      };
    }
    case "participant_left": {
      if (!state.roomState) return state;
      return {
        ...state,
        roomState: {
          ...state.roomState,
          participants: state.roomState.participants.filter(
            (p) => p.name !== action.payload.name
          ),
        },
      };
    }
    case "vote_cast": {
      if (!state.roomState) return state;
      return {
        ...state,
        roomState: {
          ...state.roomState,
          participants: state.roomState.participants.map((p) =>
            p.name === action.payload.name ? { ...p, hasVoted: true } : p
          ),
        },
      };
    }
    case "votes_revealed": {
      if (!state.roomState) return state;
      return {
        ...state,
        roomState: {
          ...state.roomState,
          votes: action.payload.votes,
          average: action.payload.average,
          currentSession: state.roomState.currentSession
            ? { ...state.roomState.currentSession, revealedAt: Date.now() }
            : null,
        },
      };
    }
    case "result_saved": {
      if (!state.roomState) return state;
      return {
        ...state,
        roomState: {
          ...state.roomState,
          currentSession: state.roomState.currentSession
            ? { ...state.roomState.currentSession, result: action.payload.result }
            : null,
        },
      };
    }
    case "round_started": {
      if (!state.roomState) return state;
      return {
        ...state,
        roomState: {
          ...state.roomState,
          currentSession: action.payload.session,
          votes: [],
          average: null,
          participants: state.roomState.participants.map((p) => ({
            ...p,
            hasVoted: false,
          })),
        },
      };
    }
    case "queue_updated": {
      if (!state.roomState) return state;
      return {
        ...state,
        roomState: {
          ...state.roomState,
          storyQueue: action.payload.queue,
        },
      };
    }
    case "error":
      return { ...state, error: action.payload.message };
  }
}

export function useRoom(joinPayload: JoinRoomPayload | null) {
  const [state, dispatch] = useReducer(reducer, {
    connected: false,
    roomState: null,
    error: null,
  });

  useEffect(() => {
    if (!joinPayload) return;

    socket.connect();

    const onConnect = () => {
      dispatch({ type: "connected" });
      socket.emit(CLIENT_EVENTS.JOIN_ROOM, joinPayload);
    };
    const onDisconnect = () => dispatch({ type: "disconnected" });
    const onRoomState = (p: RoomState) => dispatch({ type: "room_state", payload: p });
    const onJoined = (p: { name: string; role: string }) => dispatch({ type: "participant_joined", payload: p });
    const onLeft = (p: { name: string }) => dispatch({ type: "participant_left", payload: p });
    const onVoteCast = (p: { name: string; hasVoted: boolean }) =>
      dispatch({ type: "vote_cast", payload: p });
    const onRevealed = (p: { votes: Vote[]; average: number | null }) =>
      dispatch({ type: "votes_revealed", payload: p });
    const onSaved = (p: { sessionId: string; result: string }) =>
      dispatch({ type: "result_saved", payload: p });
    const onRound = (p: { session: Session }) =>
      dispatch({ type: "round_started", payload: p });
    const onQueueUpdated = (p: { queue: PlannedStory[] }) =>
      dispatch({ type: "queue_updated", payload: p });
    const onError = (p: { message: string }) =>
      dispatch({ type: "error", payload: p });

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on(SERVER_EVENTS.ROOM_STATE, onRoomState);
    socket.on(SERVER_EVENTS.PARTICIPANT_JOINED, onJoined);
    socket.on(SERVER_EVENTS.PARTICIPANT_LEFT, onLeft);
    socket.on(SERVER_EVENTS.VOTE_CAST, onVoteCast);
    socket.on(SERVER_EVENTS.VOTES_REVEALED, onRevealed);
    socket.on(SERVER_EVENTS.RESULT_SAVED, onSaved);
    socket.on(SERVER_EVENTS.ROUND_STARTED, onRound);
    socket.on(SERVER_EVENTS.QUEUE_UPDATED, onQueueUpdated);
    socket.on(SERVER_EVENTS.ERROR, onError);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off(SERVER_EVENTS.ROOM_STATE, onRoomState);
      socket.off(SERVER_EVENTS.PARTICIPANT_JOINED, onJoined);
      socket.off(SERVER_EVENTS.PARTICIPANT_LEFT, onLeft);
      socket.off(SERVER_EVENTS.VOTE_CAST, onVoteCast);
      socket.off(SERVER_EVENTS.VOTES_REVEALED, onRevealed);
      socket.off(SERVER_EVENTS.RESULT_SAVED, onSaved);
      socket.off(SERVER_EVENTS.ROUND_STARTED, onRound);
      socket.off(SERVER_EVENTS.QUEUE_UPDATED, onQueueUpdated);
      socket.off(SERVER_EVENTS.ERROR, onError);
      socket.disconnect();
    };
  }, [joinPayload?.roomId, joinPayload?.name]);

  return state;
}
