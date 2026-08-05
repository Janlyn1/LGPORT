import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const creators = sqliteTable(
  "creators",
  {
    id: text("id").primaryKey(),
    username: text("username").notNull(),
    displayName: text("display_name").notNull(),
    profileLink: text("profile_link").notNull(),
    followerCount: integer("follower_count").notNull().default(0),
    followingCount: integer("following_count").notNull().default(0),
    totalLikes: integer("total_likes").notNull().default(0),
    country: text("country").notNull().default(""),
    email: text("email").notNull().default(""),
    niche: text("niche").notNull().default(""),
    bio: text("bio").notNull().default(""),
    profileImage: text("profile_image").notNull().default(""),
    status: text("status").notNull().default("For Approval"),
    assignedTo: text("assigned_to").notNull().default(""),
    savedByName: text("saved_by_name").notNull().default(""),
    savedByEmail: text("saved_by_email").notNull().default(""),
    contactDate: text("contact_date").notNull().default(""),
    responseStatus: text("response_status").notNull().default(""),
    notes: text("notes").notNull().default(""),
    savedAt: text("saved_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("idx_creators_username_unique").on(table.username),
    uniqueIndex("idx_creators_profile_link_unique").on(table.profileLink),
    index("idx_creators_status").on(table.status),
    index("idx_creators_updated_at").on(table.updatedAt),
  ],
);

export const creatorActivity = sqliteTable(
  "creator_activity",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    creatorId: text("creator_id").notNull(),
    action: text("action").notNull(),
    actorName: text("actor_name").notNull().default(""),
    actorEmail: text("actor_email").notNull().default(""),
    detail: text("detail").notNull().default(""),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_creator_activity_creator_id").on(table.creatorId),
    index("idx_creator_activity_created_at").on(table.createdAt),
  ],
);
