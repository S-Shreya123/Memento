import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// default user roles. can add / remove based on the project as needed
export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  MEMBER: "member",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
);
export type Role = Infer<typeof roleValidator>;

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables, // do not remove or modify

    // the users table is the default users table that is brought in by the authTables
    users: defineTable({
      name: v.optional(v.string()), // name of the user. do not remove
      image: v.optional(v.string()), // image of the user. do not remove
      email: v.optional(v.string()), // email of the user. do not remove
      emailVerificationTime: v.optional(v.number()), // email verification time. do not remove
      isAnonymous: v.optional(v.boolean()), // is the user anonymous. do not remove

      role: v.optional(roleValidator), // role of the user. do not remove
      appRole: v.optional(v.union(v.literal("caregiver"), v.literal("patient"))),
      patientId: v.optional(v.id("patients")), // patients link back to their profile row
    }).index("email", ["email"]), // index for the email. do not remove or modify

    // ─── Memento ──────────────────────────────────────────────────────────

    // One workspace row per caregiver account; holds the patient profile
    // and game-state (adaptive level counters) for that household.
    patients: defineTable({
      ownerUserId: v.id("users"),
      name: v.string(),
      preferredLanguage: v.string(),
      hobbies: v.array(v.string()),
      favouriteMusic: v.array(v.string()),
      importantPlaces: v.array(v.string()),
      importantEvents: v.array(
        v.object({ label: v.string(), detail: v.optional(v.string()) }),
      ),
      photoLevel: v.number(), // adaptive: options count for photo game (2–6)
      relationshipLevel: v.number(), // adaptive: option count for family-tree game (2–5)
      photoStreak: v.number(), // consecutive correct answers (no hint)
      relationshipStreak: v.number(),
      seeded: v.optional(v.boolean()),
      // true → the client should still add the built-in demo music tracks once
      demoMusicSeeded: v.optional(v.boolean()),
    }).index("by_owner", ["ownerUserId"]),

    familyMembers: defineTable({
      ownerUserId: v.id("users"),
      patientId: v.id("patients"),
      name: v.string(),
      relationship: v.string(),
      photoId: v.optional(v.id("photos")),
      // short video clip of the person (watched in the memory library and
      // shown instead of the photo in the recognition game)
      videoStorageId: v.optional(v.id("_storage")),
      videoFileName: v.optional(v.string()),
      notes: v.optional(v.string()),
    })
      .index("by_patient", ["patientId"])
      .index("by_owner", ["ownerUserId"]),

    // Data URLs (SVG placeholders / uploaded images); uploaded via dataUrl field
    photos: defineTable({
      ownerUserId: v.id("users"),
      patientId: v.id("patients"),
      dataUrl: v.string(),
      caption: v.optional(v.string()),
      memberIds: v.array(v.id("familyMembers")),
    })
      .index("by_patient", ["patientId"])
      .index("by_owner", ["ownerUserId"]),

    // Playable songs (caregiver-added) offered during activities.
    // source "spotify" → a link to open.spotify.com played in Spotify's own
    // embed; source "upload" → an audio file in storage (storageId) or a
    // small built-in sound (dataUrl, demo: true).
    musicTracks: defineTable({
      ownerUserId: v.id("users"),
      patientId: v.id("patients"),
      title: v.string(),
      source: v.union(v.literal("spotify"), v.literal("upload")),
      spotifyUrl: v.optional(v.string()),
      storageId: v.optional(v.id("_storage")),
      dataUrl: v.optional(v.string()),
      fileName: v.optional(v.string()),
      demo: v.optional(v.boolean()),
      addedAt: v.number(),
    })
      .index("by_patient", ["patientId"])
      .index("by_owner", ["ownerUserId"]),

    activityLogs: defineTable({
      ownerUserId: v.id("users"),
      patientId: v.id("patients"),
      activityType: v.union(
        v.literal("photo_recognition"),
        v.literal("family_tree"),
        v.literal("jigsaw"),
      ),
      // per-item outcome for games; session-level for jigsaw
      outcome: v.union(
        v.literal("correct"),
        v.literal("incorrect"),
        v.literal("hint_used"),
        v.literal("dont_remember"),
      ),
      difficultyLevel: v.number(), // options shown / jigsaw piece count
      at: v.number(), // epoch ms
      meta: v.optional(
        v.object({
          personName: v.optional(v.string()),
          timeSeconds: v.optional(v.number()),
          mistakes: v.optional(v.number()),
          hints: v.optional(v.number()),
        }),
      ),
    })
      .index("by_patient", ["patientId"])
      .index("by_owner", ["ownerUserId"])
      .index("by_patient_type", ["patientId", "activityType"]),

    reminders: defineTable({
      ownerUserId: v.id("users"),
      patientId: v.id("patients"),
      type: v.union(
        v.literal("medicine"),
        v.literal("hydration"),
        v.literal("activity"),
        v.literal("appointment"),
      ),
      title: v.string(),
      detail: v.optional(v.string()),
      timeOfDay: v.string(), // "HH:MM" 24h
      recurrence: v.union(
        v.literal("daily"),
        v.literal("weekdays"),
        v.literal("weekends"),
        v.literal("once"),
      ),
      onceDate: v.optional(v.string()), // ISO date for "once"
      status: v.union(v.literal("pending"), v.literal("done"), v.literal("skipped")),
      lastDoneAt: v.optional(v.number()),
    })
      .index("by_patient", ["patientId"])
      .index("by_owner", ["ownerUserId"]),

    helperContacts: defineTable({
      ownerUserId: v.id("users"),
      patientId: v.id("patients"),
      name: v.string(),
      role: v.union(
        v.literal("volunteer"),
        v.literal("community_helper"),
        v.literal("local_language_speaker"),
        v.literal("healthcare_professional"),
      ),
      languages: v.array(v.string()),
      phone: v.string(),
      area: v.optional(v.string()),
      notes: v.optional(v.string()),
    })
      .index("by_patient", ["patientId"])
      .index("by_owner", ["ownerUserId"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
