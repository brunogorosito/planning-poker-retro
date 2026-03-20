import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  email: text("email").primaryKey(),
  name: text("name").notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const rooms = sqliteTable("rooms", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  roomId: text("room_id")
    .notNull()
    .references(() => rooms.id),
  storyName: text("story_name").notNull(),
  jiraKey: text("jira_key"),
  storyQueueId: text("story_queue_id"),
  result: text("result"),
  devResult: text("dev_result"),
  qaResult: text("qa_result"),
  createdAt: integer("created_at").notNull(),
  revealedAt: integer("revealed_at"),
});

export const votes = sqliteTable("votes", {
  id: text("id").primaryKey(),
  sessionId: text("session_id")
    .notNull()
    .references(() => sessions.id),
  participantName: text("participant_name").notNull(),
  participantRole: text("participant_role"),
  value: text("value").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const storyQueue = sqliteTable("story_queue", {
  id: text("id").primaryKey(),
  roomId: text("room_id")
    .notNull()
    .references(() => rooms.id),
  storyName: text("story_name").notNull(),
  jiraKey: text("jira_key"),
  position: integer("position").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const retros = sqliteTable("retros", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  facilitatorEmail: text("facilitator_email").notNull(),
  roomId: text("room_id"),
  timerSeconds: integer("timer_seconds").notNull(),
  writingEndsAt: integer("writing_ends_at"),
  phase: text("phase").notNull().default("waiting"),
  votesPerPerson: integer("votes_per_person").notNull().default(5),
  createdAt: integer("created_at").notNull(),
});

export const retroColumns = sqliteTable("retro_columns", {
  id: text("id").primaryKey(),
  retroId: text("retro_id").notNull(),
  title: text("title").notNull(),
  emoji: text("emoji"),
  position: integer("position").notNull(),
});

export const retroItems = sqliteTable("retro_items", {
  id: text("id").primaryKey(),
  retroId: text("retro_id").notNull(),
  columnId: text("column_id").notNull(),
  authorEmail: text("author_email").notNull(),
  content: text("content").notNull(),
  votes: integer("votes").notNull().default(0),
  createdAt: integer("created_at").notNull(),
});

export const retroVotes = sqliteTable("retro_votes", {
  id: text("id").primaryKey(),
  itemId: text("item_id").notNull(),
  voterEmail: text("voter_email").notNull(),
});
