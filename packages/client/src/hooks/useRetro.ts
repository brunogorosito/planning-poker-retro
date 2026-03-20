import { useEffect, useReducer } from "react";
import { socket } from "../socket";
import { RETRO_CLIENT_EVENTS, RETRO_SERVER_EVENTS } from "../../../server/src/events";
import type {
  RetroState,
  RetroItem,
  RetroParticipant,
  RetroPhase,
} from "../../../server/src/types";

interface State {
  retroState: RetroState | null;
  error: string | null;
  myEmail: string;
}

type Action =
  | { type: "retro_state"; payload: RetroState }
  | { type: "participant_joined"; payload: { name: string; email: string } }
  | { type: "participant_left"; payload: { name: string; email: string } }
  | { type: "card_added"; payload: { card: RetroItem } }
  | { type: "card_updated"; payload: { card: RetroItem } }
  | { type: "card_deleted"; payload: { cardId: string } }
  | { type: "card_counts"; payload: { counts: { email: string; count: number }[] } }
  | { type: "revealed"; payload: { cards: RetroItem[] } }
  | { type: "card_voted"; payload: { cardId: string; votes: number; voterEmail: string; newVotesLeft: number } }
  | { type: "phase_changed"; payload: { phase: RetroPhase; writingEndsAt?: number } }
  | { type: "error"; payload: { message: string } };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "retro_state":
      return { ...state, retroState: action.payload };
    case "participant_joined": {
      if (!state.retroState) return state;
      const already = state.retroState.participants.some((p) => p.email === action.payload.email);
      if (already) return state;
      const newP: RetroParticipant = {
        name: action.payload.name,
        email: action.payload.email,
        isFacilitator: false,
        cardCount: 0,
      };
      return {
        ...state,
        retroState: {
          ...state.retroState,
          participants: [...state.retroState.participants, newP],
        },
      };
    }
    case "participant_left": {
      if (!state.retroState) return state;
      return {
        ...state,
        retroState: {
          ...state.retroState,
          participants: state.retroState.participants.filter((p) => p.email !== action.payload.email),
        },
      };
    }
    case "card_added": {
      if (!state.retroState) return state;
      return {
        ...state,
        retroState: {
          ...state.retroState,
          myCards: [...state.retroState.myCards, action.payload.card],
        },
      };
    }
    case "card_updated": {
      if (!state.retroState) return state;
      return {
        ...state,
        retroState: {
          ...state.retroState,
          myCards: state.retroState.myCards.map((c) =>
            c.id === action.payload.card.id ? action.payload.card : c
          ),
        },
      };
    }
    case "card_deleted": {
      if (!state.retroState) return state;
      return {
        ...state,
        retroState: {
          ...state.retroState,
          myCards: state.retroState.myCards.filter((c) => c.id !== action.payload.cardId),
        },
      };
    }
    case "card_counts": {
      if (!state.retroState) return state;
      return {
        ...state,
        retroState: {
          ...state.retroState,
          participants: state.retroState.participants.map((p) => {
            const found = action.payload.counts.find((c) => c.email === p.email);
            return found ? { ...p, cardCount: found.count } : p;
          }),
        },
      };
    }
    case "revealed": {
      if (!state.retroState) return state;
      return {
        ...state,
        retroState: {
          ...state.retroState,
          allCards: action.payload.cards,
          retro: { ...state.retroState.retro, phase: "revealed" },
        },
      };
    }
    case "card_voted": {
      if (!state.retroState) return state;
      const isMe = action.payload.voterEmail === state.myEmail;
      return {
        ...state,
        retroState: {
          ...state.retroState,
          allCards: state.retroState.allCards.map((c) =>
            c.id === action.payload.cardId ? { ...c, votes: action.payload.votes } : c
          ),
          myVotesLeft: isMe ? action.payload.newVotesLeft : state.retroState.myVotesLeft,
        },
      };
    }
    case "phase_changed": {
      if (!state.retroState) return state;
      return {
        ...state,
        retroState: {
          ...state.retroState,
          retro: {
            ...state.retroState.retro,
            phase: action.payload.phase,
            writingEndsAt: action.payload.writingEndsAt ?? state.retroState.retro.writingEndsAt,
          },
        },
      };
    }
    case "error":
      return { ...state, error: action.payload.message };
    default:
      return state;
  }
}

interface UseRetroParams {
  retroId: string;
  name: string;
  email: string;
}

export function useRetro({ retroId, name, email }: UseRetroParams) {
  const [state, dispatch] = useReducer(reducer, { retroState: null, error: null, myEmail: email });

  useEffect(() => {
    socket.connect();

    const onConnect = () => {
      socket.emit(RETRO_CLIENT_EVENTS.JOIN_RETRO, { retroId, name, email });
    };

    const onRetroState = (p: RetroState) => dispatch({ type: "retro_state", payload: p });
    const onJoined = (p: { name: string; email: string }) => dispatch({ type: "participant_joined", payload: p });
    const onLeft = (p: { name: string; email: string }) => dispatch({ type: "participant_left", payload: p });
    const onCardAdded = (p: { card: RetroItem }) => dispatch({ type: "card_added", payload: p });
    const onCardUpdated = (p: { card: RetroItem }) => dispatch({ type: "card_updated", payload: p });
    const onCardDeleted = (p: { cardId: string }) => dispatch({ type: "card_deleted", payload: p });
    const onCardCounts = (p: { counts: { email: string; count: number }[] }) =>
      dispatch({ type: "card_counts", payload: p });
    const onRevealed = (p: { cards: RetroItem[] }) => dispatch({ type: "revealed", payload: p });
    const onCardVoted = (p: { cardId: string; votes: number; voterEmail: string; newVotesLeft: number }) =>
      dispatch({ type: "card_voted", payload: p });
    const onPhaseChanged = (p: { phase: RetroPhase; writingEndsAt?: number }) =>
      dispatch({ type: "phase_changed", payload: p });
    const onError = (p: { message: string }) => dispatch({ type: "error", payload: p });

    socket.on("connect", onConnect);
    socket.on(RETRO_SERVER_EVENTS.RETRO_STATE, onRetroState);
    socket.on(RETRO_SERVER_EVENTS.RETRO_PARTICIPANT_JOINED, onJoined);
    socket.on(RETRO_SERVER_EVENTS.RETRO_PARTICIPANT_LEFT, onLeft);
    socket.on(RETRO_SERVER_EVENTS.RETRO_CARD_ADDED, onCardAdded);
    socket.on(RETRO_SERVER_EVENTS.RETRO_CARD_UPDATED, onCardUpdated);
    socket.on(RETRO_SERVER_EVENTS.RETRO_CARD_DELETED, onCardDeleted);
    socket.on(RETRO_SERVER_EVENTS.RETRO_CARD_COUNTS, onCardCounts);
    socket.on(RETRO_SERVER_EVENTS.RETRO_REVEALED, onRevealed);
    socket.on(RETRO_SERVER_EVENTS.RETRO_CARD_VOTED, onCardVoted);
    socket.on(RETRO_SERVER_EVENTS.RETRO_PHASE_CHANGED, onPhaseChanged);
    socket.on("error", onError);

    if (socket.connected) {
      socket.emit(RETRO_CLIENT_EVENTS.JOIN_RETRO, { retroId, name, email });
    }

    return () => {
      socket.off("connect", onConnect);
      socket.off(RETRO_SERVER_EVENTS.RETRO_STATE, onRetroState);
      socket.off(RETRO_SERVER_EVENTS.RETRO_PARTICIPANT_JOINED, onJoined);
      socket.off(RETRO_SERVER_EVENTS.RETRO_PARTICIPANT_LEFT, onLeft);
      socket.off(RETRO_SERVER_EVENTS.RETRO_CARD_ADDED, onCardAdded);
      socket.off(RETRO_SERVER_EVENTS.RETRO_CARD_UPDATED, onCardUpdated);
      socket.off(RETRO_SERVER_EVENTS.RETRO_CARD_DELETED, onCardDeleted);
      socket.off(RETRO_SERVER_EVENTS.RETRO_CARD_COUNTS, onCardCounts);
      socket.off(RETRO_SERVER_EVENTS.RETRO_REVEALED, onRevealed);
      socket.off(RETRO_SERVER_EVENTS.RETRO_CARD_VOTED, onCardVoted);
      socket.off(RETRO_SERVER_EVENTS.RETRO_PHASE_CHANGED, onPhaseChanged);
      socket.off("error", onError);
      socket.disconnect();
    };
  }, [retroId, name, email]);

  return state;
}
