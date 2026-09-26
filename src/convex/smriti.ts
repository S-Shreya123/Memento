import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getCurrentUser } from "./users";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Assemble a question's option list: the correct answer first, then
 * distractors, all shuffled — and de-duplicated, so two family members who
 * share a name (or a name that repeats across the pool) can never appear as
 * two buttons that mean different things. Returns the options plus the index
 * of the correct answer inside them, which the UI highlights by position.
 */
function buildOptions(correct: string, distractors: string[], wanted: number) {
  const options = [correct];
  for (const d of distractors) {
    if (options.length >= Math.max(2, wanted)) break;
    if (!options.some((o) => o.toLowerCase() === d.toLowerCase())) options.push(d);
  }
  const shuffled = shuffle(options);
  return { options: shuffled, correctIx: shuffled.indexOf(correct) };
}

async function getWorkspace(ctx: any) {
  const user = await getCurrentUser(ctx);
  if (!user) return null;
  const patient = await ctx.db
    .query("patients")
    .withIndex("by_owner", (q: any) => q.eq("ownerUserId", user._id))
    .first();
  if (!patient) return { user, patient: null };
  return { user, patient };
}

/* ─────────────────────────── workspace bootstrap ─────────────────────────── */

export const getWorkspaceSummary = query({
  args: {},
  handler: async (ctx) => {
    const ws = await getWorkspace(ctx);
    if (!ws) return null;
    if (!ws.patient) return { user: ws.user, patient: null };
    const members = await ctx.db
      .query("familyMembers")
      .withIndex("by_patient", (q: any) => q.eq("patientId", ws.patient._id))
      .collect();
    const photos = await ctx.db
      .query("photos")
      .withIndex("by_patient", (q: any) => q.eq("patientId", ws.patient._id))
      .collect();
    const reminders = await ctx.db
      .query("reminders")
      .withIndex("by_patient", (q: any) => q.eq("patientId", ws.patient._id))
      .collect();
    const helpers = await ctx.db
      .query("helperContacts")
      .withIndex("by_patient", (q: any) => q.eq("patientId", ws.patient._id))
      .collect();
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const pendingToday = reminders.filter(
      (r: any) => !(r.status === "done" && (r.lastDoneAt ?? 0) >= startOfDay.getTime()),
    ).length;
    return {
      user: ws.user,
      patient: ws.patient,
      counts: {
        family: members.length,
        photos: photos.length,
        reminders: reminders.length,
        pendingToday,
        helpers: helpers.length,
      },
    };
  },
});

/* ─────────────────────────── game: photo recognition ─────────────────────────── */

export const getGameRound = query({
  args: {
    activityType: v.union(
      v.literal("photo_recognition"),
      v.literal("family_tree"),
    ),
    count: v.number(),
    // unused server-side; lets the client re-run the query for a fresh round
    seed: v.optional(v.number()),
  },
  handler: async (ctx, { activityType, count }) => {
    const ws = await getWorkspace(ctx);
    if (!ws || !ws.patient) return null;
    const patient = ws.patient;
    const members = await ctx.db
      .query("familyMembers")
      .withIndex("by_patient", (q: any) => q.eq("patientId", patient._id))
      .collect();

    const patientInfo = {
      name: patient.name,
      preferredLanguage: patient.preferredLanguage,
    };

    if (activityType === "photo_recognition") {
      const options = Math.max(2, Math.min(6, patient.photoLevel));
      const pool = members.filter((m: any) => m.photoId);
      if (pool.length < 2) return { patientInfo, options, questions: [], needSetup: true as const };
      const chosen = shuffle(pool).slice(0, Math.min(count, pool.length));
      const photos: Record<string, string> = {};
      for (const m of chosen) {
        const p = m.photoId ? await ctx.db.get(m.photoId) : null;
        if (p) photos[m._id] = p.dataUrl;
      }
      const questions: any[] = [];
      for (const m of chosen) {
        const distractors = shuffle(
          pool.filter((x: any) => x._id !== m._id),
        ).map((x: any) => x.name);
        let videoUrl: string | undefined;
        if (m.videoStorageId) {
          videoUrl = (await ctx.storage.getUrl(m.videoStorageId)) ?? undefined;
        }
        const { options: optionNames, correctIx } = buildOptions(
          m.name as string,
          distractors,
          options,
        );
        questions.push({
          key: m._id as string,
          kind: "photo" as const,
          photoUrl: photos[m._id],
          videoUrl,
          prompt: "Who is this person?",
          options: optionNames,
          correctIx,
          correctAnswer: m.name as string,
          relationship: m.relationship as string,
          notes: (m.notes ?? undefined) as string | undefined,
        });
      }
      return { patientInfo, options, questions, needSetup: false as const };
    }

    // family_tree — relationships between caregiver-entered members
    const options = Math.max(2, Math.min(5, patient.relationshipLevel));
    const relPool = members.filter(
      (m: any) => m.relationship && m.relationship.trim() !== "",
    );
    if (relPool.length < 2)
      return { patientInfo, options, questions: [], needSetup: true as const };
    const chosen = shuffle(relPool).slice(0, Math.min(count, relPool.length));
    // Distractor relationships. Includes non-kin bonds (best friend,
    // neighbour, carer …) so caregiver-entered members with those
    // relationships always have sensible wrong options to sit beside.
    const fallbackRels = [
      "Brother", "Sister", "Son", "Daughter", "Grandson", "Granddaughter",
      "Uncle", "Aunt", "Nephew", "Niece", "Cousin", "Father", "Mother",
      "Best friend", "Close friend", "Family friend", "Neighbour",
    ];      const questions = chosen.map((m: any, i: number) => {
      if (i % 2 === 0) {
        // "What is X to you?" — pick the relationship
        const ds: string[] = [];
        for (const r of shuffle(
          members.map((x: any) => x.relationship).filter(Boolean),
        )) {
          if (r !== m.relationship && !ds.includes(r)) ds.push(r);
        }
        for (const r of shuffle(fallbackRels)) {
          if (r !== m.relationship && !ds.includes(r)) ds.push(r);
        }
        const { options: optionNames, correctIx } = buildOptions(
          m.relationship as string,
          ds,
          options,
        );
        return {
          key: m._id as string,
          kind: "askRelationship" as const,
          personName: m.name as string,
          prompt: `What is ${m.name} to you?`,
          options: optionNames,
          correctIx,
          correctAnswer: m.relationship as string,
          notes: (m.notes ?? undefined) as string | undefined,
        };
      }
      // "Who is your wife?" — pick the person
      const ds = shuffle(members.filter((x: any) => x._id !== m._id)).map(
        (x: any) => x.name,
      );
      const { options: optionNames, correctIx } = buildOptions(
        m.name as string,
        ds,
        options,
      );
      return {
        key: m._id as string,
        kind: "askPerson" as const,
        personName: m.name as string,
        prompt: `Who is your ${String(m.relationship).toLowerCase()}?`,
        options: optionNames,
        correctIx,
        correctAnswer: m.name as string,
        photoId: (m.photoId ?? undefined) as string | undefined,
        notes: (m.notes ?? undefined) as string | undefined,
      };
    });
    return { patientInfo, options, questions, needSetup: false as const };
  },
});

/* ─────────────────────────── adaptive logging ─────────────────────────── */

export const logGameAnswer = mutation({
  args: {
    activityType: v.union(
      v.literal("photo_recognition"),
      v.literal("family_tree"),
    ),
    outcome: v.union(
      v.literal("correct"),
      v.literal("incorrect"),
      v.literal("hint_used"),
      v.literal("dont_remember"),
    ),
    difficultyLevel: v.number(),
    personName: v.optional(v.string()),
  },
  handler: async (ctx, { activityType, outcome, difficultyLevel, personName }) => {
    const ws = await getWorkspace(ctx);
    if (!ws || !ws.patient) throw new Error("No patient profile");
    const patient = ws.patient;
    await ctx.db.insert("activityLogs", {
      ownerUserId: ws.user._id,
      patientId: patient._id,
      activityType,
      outcome,
      difficultyLevel,
      at: Date.now(),
      meta: personName ? { personName } : undefined,
    });

    // Rule-based adaptive difficulty — engagement only, never a score.
    const maxLevel = activityType === "photo_recognition" ? 6 : 5;
    if (activityType === "photo_recognition") {
      let level = patient.photoLevel;
      let streak = patient.photoStreak;
      if (outcome === "correct") {
        streak += 1;
        if (streak >= 3 && level < maxLevel) {
          level += 1;
          streak = 0;
        }
      } else if (outcome === "incorrect") {
        streak = Math.max(0, streak - 1);
      } else {
        // hint or "I don't remember" → simplify & repeat familiar people
        streak = 0;
        if (level > 2) level -= 1;
      }
      await ctx.db.patch(patient._id, { photoLevel: level, photoStreak: streak });
    } else {
      let level = patient.relationshipLevel;
      let streak = patient.relationshipStreak;
      if (outcome === "correct") {
        streak += 1;
        if (streak >= 3 && level < maxLevel) {
          level += 1;
          streak = 0;
        }
      } else if (outcome === "incorrect") {
        streak = Math.max(0, streak - 1);
      } else {
        streak = 0;
        if (level > 2) level -= 1;
      }
      await ctx.db.patch(patient._id, {
        relationshipLevel: level,
        relationshipStreak: streak,
      });
    }
  },
});

export const logJigsawSession = mutation({
  args: {
    pieceCount: v.number(),
    timeSeconds: v.number(),
    mistakes: v.number(),
    hints: v.number(),
    completed: v.boolean(),
  },
  handler: async (ctx, { pieceCount, timeSeconds, mistakes, hints, completed }) => {
    const ws = await getWorkspace(ctx);
    if (!ws || !ws.patient) throw new Error("No patient profile");
    await ctx.db.insert("activityLogs", {
      ownerUserId: ws.user._id,
      patientId: ws.patient._id,
      activityType: "jigsaw",
      outcome: completed ? "correct" : "incorrect",
      difficultyLevel: pieceCount,
      at: Date.now(),
      meta: { timeSeconds, mistakes, hints },
    });
  },
});

/* ─────────────────────────── queries for pages ─────────────────────────── */

export const getFamilyMembers = query({
  args: {},
  handler: async (ctx) => {
    const ws = await getWorkspace(ctx);
    if (!ws || !ws.patient) return [];
    const rows = await ctx.db
      .query("familyMembers")
      .withIndex("by_patient", (q: any) => q.eq("patientId", ws.patient._id))
      .collect();
    const out: any[] = [];
    for (const m of rows) {
      out.push({
        ...m,
        videoUrl: m.videoStorageId ? await ctx.storage.getUrl(m.videoStorageId) : undefined,
      });
    }
    return out;
  },
});

export const getPhotos = query({
  args: {},
  handler: async (ctx) => {
    const ws = await getWorkspace(ctx);
    if (!ws || !ws.patient) return [];
    return ctx.db
      .query("photos")
      .withIndex("by_patient", (q: any) => q.eq("patientId", ws.patient._id))
      .collect();
  },
});

export const getReminders = query({
  args: {},
  handler: async (ctx) => {
    const ws = await getWorkspace(ctx);
    if (!ws || !ws.patient) return [];
    const rows = await ctx.db
      .query("reminders")
      .withIndex("by_patient", (q: any) => q.eq("patientId", ws.patient._id))
      .collect();
    return rows.sort((a: any, b: any) =>
      a.timeOfDay < b.timeOfDay ? -1 : a.timeOfDay > b.timeOfDay ? 1 : 0,
    );
  },
});

export const getHelpers = query({
  args: {},
  handler: async (ctx) => {
    const ws = await getWorkspace(ctx);
    if (!ws || !ws.patient) return [];
    const rows = await ctx.db
      .query("helperContacts")
      .withIndex("by_patient", (q: any) => q.eq("patientId", ws.patient._id))
      .collect();
    const rank: Record<string, number> = {
      healthcare_professional: 0,
      community_helper: 1,
      local_language_speaker: 2,
      volunteer: 3,
    };
    return rows.sort(
      (a: any, b: any) => (rank[a.role] ?? 9) - (rank[b.role] ?? 9),
    );
  },
});

/* ─────────────────────────── caregiver mutations ─────────────────────────── */

export const savePatientProfile = mutation({
  args: {
    name: v.string(),
    preferredLanguage: v.string(),
    hobbies: v.array(v.string()),
    favouriteMusic: v.array(v.string()),
    importantPlaces: v.array(v.string()),
    importantEvents: v.array(
      v.object({ label: v.string(), detail: v.optional(v.string()) }),
    ),
  },
  handler: async (ctx, args) => {
    const ws = await getWorkspace(ctx);
    if (!ws || !ws.patient) throw new Error("No patient profile");
    const { name, preferredLanguage, hobbies, favouriteMusic, importantPlaces, importantEvents } = args;
    await ctx.db.patch(ws.patient._id, {
      name,
      preferredLanguage,
      hobbies,
      favouriteMusic,
      importantPlaces,
      importantEvents,
    });
  },
});

/** One language for the whole household — settable by patient or caregiver. */
export const setPatientLanguage = mutation({
  args: { language: v.string() },
  handler: async (ctx, { language }) => {
    const ws = await getWorkspace(ctx);
    if (!ws || !ws.patient) return; // no profile yet → local choice only
    await ctx.db.patch(ws.patient._id, { preferredLanguage: language });
  },
});

export const saveFamilyMember = mutation({
  args: {
    id: v.optional(v.id("familyMembers")),
    name: v.string(),
    relationship: v.string(),
    notes: v.optional(v.string()),
    photoId: v.optional(v.id("photos")),
  },
  handler: async (ctx, { id, name, relationship, notes, photoId }) => {
    const ws = await getWorkspace(ctx);
    if (!ws || !ws.patient) throw new Error("No patient profile");
    if (id) {
      await ctx.db.patch(id, { name, relationship, notes, photoId });
      if (photoId) {
        const photo = await ctx.db.get(photoId);
        if (photo && !photo.memberIds.includes(id)) {
          await ctx.db.patch(photoId, { memberIds: [...photo.memberIds, id] });
        }
      }
      return id;
    }
    return await ctx.db.insert("familyMembers", {
      ownerUserId: ws.user._id,
      patientId: ws.patient._id,
      name,
      relationship,
      notes,
      photoId,
    });
  },
});

export const deleteFamilyMember = mutation({
  args: { id: v.id("familyMembers") },
  handler: async (ctx, { id }) => {
    const ws = await getWorkspace(ctx);
    if (!ws) return;
    const member = await ctx.db.get(id);
    if (member?.photoId) {
      const photo = await ctx.db.get(member.photoId);
      if (photo) {
        await ctx.db.patch(photo._id, {
          memberIds: photo.memberIds.filter((x) => x !== id),
        });
      }
    }
    await ctx.db.delete(id);
  },
});

export const savePhoto = mutation({
  args: {
    id: v.optional(v.id("photos")),
    dataUrl: v.string(),
    caption: v.optional(v.string()),
    memberIds: v.array(v.id("familyMembers")),
  },
  handler: async (ctx, { id, dataUrl, caption, memberIds }) => {
    const ws = await getWorkspace(ctx);
    if (!ws || !ws.patient) throw new Error("No patient profile");
    if (id) {
      await ctx.db.patch(id, { dataUrl, caption, memberIds });
      return id;
    }
    return await ctx.db.insert("photos", {
      ownerUserId: ws.user._id,
      patientId: ws.patient._id,
      dataUrl,
      caption,
      memberIds,
    });
  },
});

export const deletePhoto = mutation({
  args: { id: v.id("photos") },
  handler: async (ctx, { id }) => {
    const ws = await getWorkspace(ctx);
    if (!ws) return;
    const members = await ctx.db
      .query("familyMembers")
      .withIndex("by_patient", (q: any) => q.eq("patientId", ws.patient!._id))
      .collect();
    for (const m of members) {
      if (m.photoId === id) await ctx.db.patch(m._id, { photoId: undefined });
    }
    await ctx.db.delete(id);
  },
});

export const saveReminder = mutation({
  args: {
    id: v.optional(v.id("reminders")),
    type: v.union(
      v.literal("medicine"),
      v.literal("hydration"),
      v.literal("activity"),
      v.literal("appointment"),
    ),
    title: v.string(),
    detail: v.optional(v.string()),
    timeOfDay: v.string(),
    recurrence: v.union(
      v.literal("daily"),
      v.literal("weekdays"),
      v.literal("weekends"),
      v.literal("once"),
    ),
    onceDate: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...rest }) => {
    const ws = await getWorkspace(ctx);
    if (!ws || !ws.patient) throw new Error("No patient profile");
    if (id) {
      await ctx.db.patch(id, { ...rest, status: "pending" });
      return id;
    }
    return await ctx.db.insert("reminders", {
      ownerUserId: ws.user._id,
      patientId: ws.patient._id,
      status: "pending",
      ...rest,
    });
  },
});

export const setReminderStatus = mutation({
  args: {
    id: v.id("reminders"),
    status: v.union(
      v.literal("pending"),
      v.literal("done"),
      v.literal("skipped"),
    ),
  },
  handler: async (ctx, { id, status }) => {
    const ws = await getWorkspace(ctx);
    if (!ws) return;
    await ctx.db.patch(id, {
      status,
      lastDoneAt: status === "pending" ? undefined : Date.now(),
    });
  },
});

export const deleteReminder = mutation({
  args: { id: v.id("reminders") },
  handler: async (ctx, { id }) => {
    const ws = await getWorkspace(ctx);
    if (!ws) return;
    await ctx.db.delete(id);
  },
});

export const saveHelper = mutation({
  args: {
    id: v.optional(v.id("helperContacts")),
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
  },
  handler: async (ctx, { id, ...rest }) => {
    const ws = await getWorkspace(ctx);
    if (!ws || !ws.patient) throw new Error("No patient profile");
    if (id) {
      await ctx.db.patch(id, rest);
      return id;
    }
    return await ctx.db.insert("helperContacts", {
      ownerUserId: ws.user._id,
      patientId: ws.patient._id,
      ...rest,
    });
  },
});

export const deleteHelper = mutation({
  args: { id: v.id("helperContacts") },
  handler: async (ctx, { id }) => {
    const ws = await getWorkspace(ctx);
    if (!ws) return;
    await ctx.db.delete(id);
  },
});

/* ───────────── music library (played during activities) ───────────── */

export const getMusicTracks = query({
  args: {},
  handler: async (ctx) => {
    const ws = await getWorkspace(ctx);
    if (!ws || !ws.patient) return [];
    const rows = await ctx.db
      .query("musicTracks")
      .withIndex("by_patient", (q: any) => q.eq("patientId", ws.patient._id))
      .collect();
    rows.sort((a: any, b: any) => a.addedAt - b.addedAt);
    const out: any[] = [];
    for (const t of rows) {
      out.push({
        _id: t._id,
        title: t.title,
        source: t.source,
        spotifyUrl: t.spotifyUrl,
        dataUrl: t.dataUrl,
        fileName: t.fileName,
        demo: t.demo,
        audioUrl: t.storageId ? await ctx.storage.getUrl(t.storageId) : undefined,
      });
    }
    return out;
  },
});

/** Step 1 of an audio upload: get a write URL for the file. */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not signed in");
    return await ctx.storage.generateUploadUrl();
  },
});

/** Step 2: turn an uploaded audio file into a playable track. */
export const finalizeTrackUpload = mutation({
  args: {
    title: v.string(),
    storageId: v.id("_storage"),
    fileName: v.optional(v.string()),
  },
  handler: async (ctx, { title, storageId, fileName }) => {
    const ws = await getWorkspace(ctx);
    if (!ws || !ws.patient) throw new Error("No patient profile");
    return await ctx.db.insert("musicTracks", {
      ownerUserId: ws.user._id,
      patientId: ws.patient._id,
      title,
      source: "upload",
      storageId,
      fileName,
      addedAt: Date.now(),
    });
  },
});

/** Add a Spotify song by link (a track, album or playlist URL). */
export const saveSpotifyTrack = mutation({
  args: { title: v.string(), spotifyUrl: v.string() },
  handler: async (ctx, { title, spotifyUrl }) => {
    const ws = await getWorkspace(ctx);
    if (!ws || !ws.patient) throw new Error("No patient profile");
    const url = spotifyUrl.trim();
    if (!/^https:\/\/(open\.)?spotify\.com\//i.test(url) && !url.startsWith("spotify:")) {
      throw new Error("Please paste a Spotify link (it should start with https://open.spotify.com/)");
    }
    return await ctx.db.insert("musicTracks", {
      ownerUserId: ws.user._id,
      patientId: ws.patient._id,
      title,
      source: "spotify",
      spotifyUrl: url,
      addedAt: Date.now(),
    });
  },
});

export const deleteMusicTrack = mutation({
  args: { id: v.id("musicTracks") },
  handler: async (ctx, { id }) => {
    const ws = await getWorkspace(ctx);
    if (!ws) return;
    const track = await ctx.db.get(id);
    if (track?.storageId) {
      try {
        await ctx.storage.delete(track.storageId);
      } catch {
        // file may already be gone; removing the row is still correct
      }
    }
    await ctx.db.delete(id);
  },
});

/* ───────────── videos of family members ───────────── */

export const getFamilyVideos = query({
  args: {},
  handler: async (ctx) => {
    const ws = await getWorkspace(ctx);
    if (!ws || !ws.patient) return {};
    const members = await ctx.db
      .query("familyMembers")
      .withIndex("by_patient", (q: any) => q.eq("patientId", ws.patient._id))
      .collect();
    const out: Record<string, { url: string; fileName: string }> = {};
    for (const m of members) {
      if (m.videoStorageId) {
        const url = await ctx.storage.getUrl(m.videoStorageId);
        if (url) out[m._id] = { url, fileName: m.videoFileName ?? "Video" };
      }
    }
    return out;
  },
});

/** Attach an uploaded video (storageId from generateUploadUrl) to a member. */
export const finalizeMemberVideo = mutation({
  args: {
    memberId: v.id("familyMembers"),
    storageId: v.id("_storage"),
    fileName: v.optional(v.string()),
  },
  handler: async (ctx, { memberId, storageId, fileName }) => {
    const ws = await getWorkspace(ctx);
    if (!ws) throw new Error("Not signed in");
    const member = await ctx.db.get(memberId);
    if (!member || member.ownerUserId !== ws.user._id) throw new Error("Not found");
    // replace an existing clip cleanly
    if (member.videoStorageId) {
      try {
        await ctx.storage.delete(member.videoStorageId);
      } catch {
        // ignore; the old file may already be gone
      }
    }
    await ctx.db.patch(memberId, { videoStorageId: storageId, videoFileName: fileName });
  },
});

export const removeMemberVideo = mutation({
  args: { memberId: v.id("familyMembers") },
  handler: async (ctx, { memberId }) => {
    const ws = await getWorkspace(ctx);
    if (!ws) throw new Error("Not signed in");
    const member = await ctx.db.get(memberId);
    if (!member || member.ownerUserId !== ws.user._id) throw new Error("Not found");
    if (member.videoStorageId) {
      try {
        await ctx.storage.delete(member.videoStorageId);
      } catch {
        // ignore
      }
    }
    await ctx.db.patch(memberId, { videoStorageId: undefined, videoFileName: undefined });
  },
});

/* ─────────────────────────── caregiver activity stats ─────────────────────────── */

export const getActivityStats = query({
  args: {},
  handler: async (ctx) => {
    const ws = await getWorkspace(ctx);
    if (!ws || !ws.patient) return null;
    const logs = await ctx.db
      .query("activityLogs")
      .withIndex("by_owner", (q: any) => q.eq("ownerUserId", ws.user._id))
      .collect();
    logs.sort((a: any, b: any) => b.at - a.at);

    const is = (l: any, t: string) => l.activityType === t;
    const count = (arr: any[], f: (l: any) => boolean) => arr.filter(f).length;

    const photoLogs = logs.filter((l: any) => is(l, "photo_recognition"));
    const treeLogs = logs.filter((l: any) => is(l, "family_tree"));
    const jigsawLogs = logs.filter((l: any) => is(l, "jigsaw"));

    // last 14 days activity
    const daily: { day: string; games: number; jigsaw: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      const inDay = logs.filter((l: any) => l.at >= d.getTime() && l.at < next.getTime());
      daily.push({
        day: d.toISOString().slice(0, 10),
        games: count(inDay, (l) => l.activityType !== "jigsaw"),
        jigsaw: count(inDay, (l) => l.activityType === "jigsaw"),
      });
    }

    const reminders = await ctx.db
      .query("reminders")
      .withIndex("by_patient", (q: any) => q.eq("patientId", ws.patient._id))
      .collect();
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const doneToday = reminders.filter(
      (r: any) => r.status === "done" && (r.lastDoneAt ?? 0) >= startOfDay.getTime(),
    ).length;

    return {
      levels: { photoLevel: ws.patient.photoLevel, relationshipLevel: ws.patient.relationshipLevel },
      totals: {
        photoAnswers: photoLogs.length,
        photoCorrect: count(photoLogs, (l) => l.outcome === "correct"),
        photoHintOrSkip: count(photoLogs, (l) => l.outcome === "hint_used" || l.outcome === "dont_remember"),
        treeAnswers: treeLogs.length,
        treeCorrect: count(treeLogs, (l) => l.outcome === "correct"),
        treeHintOrSkip: count(treeLogs, (l) => l.outcome === "hint_used" || l.outcome === "dont_remember"),
        jigsawSessions: jigsawLogs.length,
        jigsawCompleted: count(jigsawLogs, (l) => l.outcome === "correct"),
      },
      daily,
      recent: logs.slice(0, 12).map((l: any) => ({
        _id: l._id,
        activityType: l.activityType,
        outcome: l.outcome,
        difficultyLevel: l.difficultyLevel,
        at: l.at,
        meta: l.meta ?? undefined,
      })),
      jigsaw: jigsawLogs.slice(0, 8).map((l: any) => ({
        _id: l._id,
        at: l.at,
        pieceCount: l.difficultyLevel,
        timeSeconds: l.meta?.timeSeconds,
        mistakes: l.meta?.mistakes,
        hints: l.meta?.hints,
        completed: l.outcome === "correct",
      })),
      reminderStats: {
        total: reminders.length,
        doneToday,
      },
    };
  },
});
