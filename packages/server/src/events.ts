// Nombres de eventos Socket.io — fuente de verdad única

export const CLIENT_EVENTS = {
  JOIN_ROOM: "join_room",
  VOTE: "vote",
  REVEAL_VOTES: "reveal_votes",
  SAVE_RESULT: "save_result",
  NEW_ROUND: "new_round",
  ADD_TO_QUEUE: "add_to_queue",
  REMOVE_FROM_QUEUE: "remove_from_queue",
  START_FROM_QUEUE: "start_from_queue",
  CLOSE_QUEUE: "close_queue",
} as const;

export const SERVER_EVENTS = {
  ROOM_STATE: "room_state",
  PARTICIPANT_JOINED: "participant_joined",
  PARTICIPANT_LEFT: "participant_left",
  VOTE_CAST: "vote_cast",
  VOTES_REVEALED: "votes_revealed",
  RESULT_SAVED: "result_saved",
  ROUND_STARTED: "round_started",
  QUEUE_UPDATED: "queue_updated",
  ERROR: "error",
} as const;

export const RETRO_CLIENT_EVENTS = {
  JOIN_RETRO: "join_retro",
  ADD_CARD: "add_card",
  EDIT_CARD: "edit_card",
  DELETE_CARD: "delete_card",
  VOTE_CARD: "vote_card",
  START_TIMER: "start_timer",
  REVEAL_NOW: "reveal_now",
  START_VOTING: "start_voting",
  CLOSE_RETRO: "close_retro",
} as const;

export const RETRO_SERVER_EVENTS = {
  RETRO_STATE: "retro_state",
  RETRO_PARTICIPANT_JOINED: "retro_participant_joined",
  RETRO_PARTICIPANT_LEFT: "retro_participant_left",
  RETRO_CARD_ADDED: "retro_card_added",
  RETRO_CARD_UPDATED: "retro_card_updated",
  RETRO_CARD_DELETED: "retro_card_deleted",
  RETRO_CARD_COUNTS: "retro_card_counts",
  RETRO_REVEALED: "retro_revealed",
  RETRO_CARD_VOTED: "retro_card_voted",
  RETRO_PHASE_CHANGED: "retro_phase_changed",
} as const;
