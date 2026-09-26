import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { placeHolder } from "./placeholders";
import { getAuthUserId } from "@convex-dev/auth/server";
import { getCurrentUser } from "./users";

/**
 * Idempotent demo seed. Runs lazily on first app load for the signed-in user
 * so the app is fully usable out of the box: one demo patient, a demo family
 * of 6 with caregiver-entered relationships, photos, reminders and helpers.
 * All "facts" below are clearly demo content owned by the caregiver profile.
 */
export const ensureSeed = mutation({
  args: {
    // Set on the welcome screen right after sign-up: the person being cared for.
    patientName: v.optional(v.string()),
    preferredLanguage: v.optional(v.string()),
  },
  handler: async (ctx, { patientName, preferredLanguage }) => {
    const ownerUserId = await getAuthUserId(ctx);
    if (ownerUserId === null) throw new Error("Not signed in");
    const existing = await ctx.db
      .query("patients")
      .withIndex("by_owner", (q) => q.eq("ownerUserId", ownerUserId))
      .first();
    if (existing) return existing._id;

    const patientId = await ctx.db.insert("patients", {
      ownerUserId,
      name: patientName?.trim() || "Amiya Bora",
      preferredLanguage: preferredLanguage?.trim() || "English",
      hobbies: ["Gardening", "Bihu folk songs", "Morning walks", "Assamese knitting"],
      favouriteMusic: ["Bihu songs (khoul)", "Bhupen Hazarika classics", "Devotional hymns"],
      importantPlaces: ["Jorhat tea garden", "Majuli river island", "Guwahati temple"],
      importantEvents: [
        { label: "Wedding anniversary", detail: "12 December" },
        { label: "Bihu festival", detail: "Mid-April, every year" },
      ],
      photoLevel: 3,
      relationshipLevel: 3,
      photoStreak: 0,
      relationshipStreak: 0,
      seeded: true,
      // the built-in demo songs are added by the client on first load
      demoMusicSeeded: false,
    });

    const members: Array<{
      key: string;
      name: string;
      relationship: string;
      notes?: string;
    }> = [
      { key: "sarala", name: "Sarala Bora", relationship: "Wife", notes: "Married in 1978. They garden together every morning." },
      { key: "debo", name: "Debojit Bora", relationship: "Son", notes: "Calls every Sunday evening." },
      { key: "ritu", name: "Ritu Bora", relationship: "Daughter", notes: "Brings sweets on Bihu." },
      { key: "arun", name: "Arun Bora", relationship: "Brother", notes: "Lives in Jorhat. They were tea-garden colleagues." },
      { key: "ipsha", name: "Ipsha Bora", relationship: "Granddaughter", notes: "Sings Bihu songs with grandpa on video calls." },
    ];

    const inserted: Record<string, { memberId: any }> = {};
    for (const m of members) {
      const photoId = await ctx.db.insert("photos", {
        ownerUserId,
        patientId,
        dataUrl: placeHolder(m.key),
        caption: m.name,
        memberIds: [],
      });
      const memberId = await ctx.db.insert("familyMembers", {
        ownerUserId,
        patientId,
        name: m.name,
        relationship: m.relationship,
        photoId,
        notes: m.notes,
      });
      await ctx.db.patch(photoId, { memberIds: [memberId] });
      inserted[m.key] = { memberId };
    }

    // A second family photo (no single-person answer) usable for jigsaw variety
    await ctx.db.insert("photos", {
      ownerUserId,
      patientId,
      dataUrl: placeHolder("amiya"),
      caption: "Amiya in the garden",
      memberIds: [],
    });

    const reminders = [
      { type: "medicine" as const, title: "Morning medicine", detail: "1 tablet, after breakfast", timeOfDay: "08:30", recurrence: "daily" as const },
      { type: "hydration" as const, title: "Drink a glass of water", timeOfDay: "11:00", recurrence: "daily" as const },
      { type: "activity" as const, title: "Evening walk", detail: "Around the garden with Sarala", timeOfDay: "17:00", recurrence: "daily" as const },
      { type: "appointment" as const, title: "Doctor visit", detail: "Dr. Hazarika, Guwahati clinic", timeOfDay: "10:00", recurrence: "weekdays" as const },
      { type: "hydration" as const, title: "Drink a glass of water", timeOfDay: "15:30", recurrence: "daily" as const },
    ];
    for (const r of reminders) {
      await ctx.db.insert("reminders", { ownerUserId, patientId, status: "pending", ...r });
    }

    const helpers = [
      { name: "Pranjal Saikia", role: "volunteer" as const, languages: ["Assamese", "English"], phone: "+91 98100 00001", area: "Guwahati", notes: "Available weekdays after 4 pm." },
      { name: "Momi Das", role: "local_language_speaker" as const, languages: ["Assamese", "Bengali"], phone: "+91 98100 00002", area: "Jorhat", notes: "Helps translate clinic forms." },
      { name: "Dr. Anup Hazarika", role: "healthcare_professional" as const, languages: ["Assamese", "English", "Hindi"], phone: "+91 98100 00003", area: "Guwahati Memory Clinic", notes: "Geriatric physician." },
      { name: "Juri Kalita", role: "community_helper" as const, languages: ["Assamese"], phone: "+91 98100 00004", area: "Majuli", notes: "Runs the community centre." },
    ];
    for (const h of helpers) {
      await ctx.db.insert("helperContacts", { ownerUserId, patientId, ...h });
    }

    return patientId;
  },
});

/* ───────────── built-in demo music (client synthesizes the audio) ─────────────
 * The browser generates short, gentle piano tones as data URLs and hands them
 * to this mutation, which stores them as demo tracks (demo: true). Families
 * replace these with real uploaded songs or Spotify links at any time. */
export const addDemoMusic = mutation({
  args: {
    tracks: v.array(
      v.object({
        title: v.string(),
        dataUrl: v.string(),
      }),
    ),
  },
  handler: async (ctx, { tracks }) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not signed in");
    const patient = await ctx.db
      .query("patients")
      .withIndex("by_owner", (q) => q.eq("ownerUserId", user._id))
      .first();
    if (!patient) throw new Error("No patient profile");
    if (patient.demoMusicSeeded) return;
    for (const t of tracks.slice(0, 5)) {
      await ctx.db.insert("musicTracks", {
        ownerUserId: user._id,
        patientId: patient._id,
        title: t.title,
        source: "upload",
        dataUrl: t.dataUrl,
        demo: true,
        addedAt: Date.now(),
      });
    }
    await ctx.db.patch(patient._id, { demoMusicSeeded: true });
  },
});
