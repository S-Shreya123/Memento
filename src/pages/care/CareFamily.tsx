import { AppShell, useWorkspace, type FamilyMember, type PhotoRow } from "@/components/smriti";
import { useLanguage } from "@/hooks/use-language";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQuery } from "convex/react";
import { useRef, useState } from "react";
import { Plus, Trash2, Pencil, Upload, X, Video } from "lucide-react";
import { cn } from "@/lib/utils";

type MemberDraft = { id?: string; name: string; relationship: string; notes: string; photoId?: string };

const emptyDraft: MemberDraft = { name: "", relationship: "", notes: "" };

// One-tap relationships — family bonds as well as non-family bonds like
// best friend or carer. Anything can still be typed free-hand; the games
// use the words exactly as entered here. All chips exist in every app
// language, so a relationship picked in Assamese still translates in games.
const RELATIONSHIP_CHIPS = [
  "Wife", "Husband", "Son", "Daughter", "Grandson", "Granddaughter",
  "Brother", "Sister", "Uncle", "Aunt", "Cousin",
  "Best friend", "Friend", "Neighbour", "Carer",
];

type MemberRow = FamilyMember & { videoUrl?: string };

export default function CareFamily() {
  const { ready } = useWorkspace();
  const { t } = useLanguage();
  const members = useQuery(api.smriti.getFamilyMembers, ready ? {} : "skip") as MemberRow[] | undefined;
  const photos = useQuery(api.smriti.getPhotos, ready ? {} : "skip");
  const saveMember = useMutation(api.smriti.saveFamilyMember);
  const deleteMember = useMutation(api.smriti.deleteFamilyMember);
  const savePhoto = useMutation(api.smriti.savePhoto);
  const deletePhoto = useMutation(api.smriti.deletePhoto);
  const generateUploadUrl = useMutation(api.smriti.generateUploadUrl);
  const finalizeVideo = useMutation(api.smriti.finalizeMemberVideo);
  const removeVideo = useMutation(api.smriti.removeMemberVideo);

  const [memberForm, setMemberForm] = useState<MemberDraft | null>(null);
  const [photoForm, setPhotoForm] = useState<{ id?: string; caption: string; dataUrl: string; memberIds: string[] } | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const [videoBusy, setVideoBusy] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);

  const uploadVideo = async (memberId: string, file: File | undefined) => {
    if (!file) return;
    setVideoBusy(true);
    setVideoError(null);
    try {
      const buffer = await file.arrayBuffer();
      const postUrl = await generateUploadUrl({});
      const res = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": file.type || "video/mp4" },
        body: buffer,
      });
      const { storageId } = (await res.json()) as { storageId: string };
      await finalizeVideo({ memberId: memberId as never, storageId: storageId as never, fileName: file.name });
    } catch {
      setVideoError(t("cf.videoErr"));
    } finally {
      setVideoBusy(false);
    }
  };

  if (!ready) {
    return (
      <AppShell role="caregiver" subtitle="Family & photos">
        <div className="swiss-container py-24 text-center text-xl text-muted-foreground">Loading…</div>
      </AppShell>
    );
  }

  const photoById = (id?: string) => photos?.find((p) => p._id === id);

  const onPickFile = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPhotoForm((f) =>
        f ? { ...f, dataUrl: String(reader.result) } : { caption: file.name.replace(/\.[^.]+$/, ""), dataUrl: String(reader.result), memberIds: [] },
      );
    };
    reader.readAsDataURL(file);
  };

  const submitMember = async () => {
    if (!memberForm || !memberForm.name.trim() || !memberForm.relationship.trim()) return;
    setSaving(true);
    try {
      await saveMember({
        id: memberForm.id as never,
        name: memberForm.name.trim(),
        relationship: memberForm.relationship.trim(),
        notes: memberForm.notes.trim() || undefined,
        photoId: memberForm.photoId as never,
      });
      setMemberForm(null);
    } finally {
      setSaving(false);
    }
  };

  const submitPhoto = async () => {
    if (!photoForm || !photoForm.dataUrl) return;
    setSaving(true);
    try {
      await savePhoto({
        id: photoForm.id as never,
        dataUrl: photoForm.dataUrl,
        caption: photoForm.caption || undefined,
        memberIds: photoForm.memberIds as never,
      });
      setPhotoForm(null);
    } finally {
    setSaving(false);
    }
  };

  return (
    <AppShell role="caregiver" subtitle="Family & photos">
      <div className="swiss-container py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="label-caps text-swiss-red">{t("cf.caps")}</p>
            <h1 className="type-display mt-2 text-4xl md:text-5xl">{t("cf.title")}</h1>
            <p className="mt-2 max-w-2xl text-lg text-muted-foreground">
              {t("cf.sub")}
            </p>
          </div>
          <div className="flex gap-2">
            <Button className="h-12 px-5 text-base" onClick={() => setMemberForm({ ...emptyDraft })}>
              <Plus className="size-5" /> {t("cf.addMember")}
            </Button>
            <Button
              variant="outline"
              className="h-12 border-2 px-5 text-base"
              onClick={() => {
                setPhotoForm({ caption: "", dataUrl: "", memberIds: [] });
                setTimeout(() => fileRef.current?.click(), 50);
              }}
            >
              <Upload className="size-5" /> {t("cf.addPhoto")}
            </Button>
          </div>
        </div>

        {/* Members list */}
        <section className="mt-10">
          <h2 className="text-2xl font-bold">{t("cf.membersT")} ({members?.length ?? 0})</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(members ?? []).map((m: MemberRow) => {
              const p = photoById(m.photoId);
              return (
                <div key={m._id} className="border-2 border-foreground bg-card">
                  <div className="flex items-center gap-4 border-b-2 border-foreground p-4">
                    {p ? (
                      <img src={p.dataUrl} alt={m.name} className="size-16 border border-foreground object-cover" />
                    ) : (
                      <div className="grid size-16 place-items-center border-2 border-dashed border-foreground/40 text-xl font-bold text-muted-foreground">
                        {m.name.charAt(0)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xl font-bold">{m.name}</p>
                      <p className="text-base text-muted-foreground">{m.relationship}</p>
                    </div>
                  </div>
                  <div className="p-4">
                    {m.notes ? <p className="text-base text-muted-foreground">{m.notes}</p> : <p className="text-base italic text-muted-foreground/60">{t("cf.noNotes")}</p>}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 border-2"
                        onClick={() =>
                          setMemberForm({ id: m._id, name: m.name, relationship: m.relationship, notes: m.notes ?? "", photoId: m.photoId ?? undefined })
                        }
                      >
                        <Pencil className="size-4" /> {t("common.edit")}
                      </Button>
                      {m.videoUrl ? (
                        <span className="label-caps flex items-center gap-1 border-2 border-swiss-blue px-2 py-1.5 text-xs text-swiss-blue">
                          <Video className="size-3.5" /> {t("cf.videoAdded")}
                        </span>
                      ) : null}
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 border-2 text-destructive"
                        onClick={() => {
                          if (confirm(t("cf.removeMemberQ", { name: m.name }))) void deleteMember({ id: m._id });
                        }}
                      >
                        <Trash2 className="size-4" /> {t("common.remove")}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Photos gallery */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold">{t("cf.photosT")} ({photos?.length ?? 0})</h2>
          <p className="mt-1 text-base text-muted-foreground">{t("cf.photoPowers")}</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {(photos ?? []).map((p: PhotoRow) => {
              const linked = (p.memberIds ?? []).map((id) => members?.find((m) => m._id === id)?.name).filter(Boolean);
              return (
                <div key={p._id} className="border-2 border-foreground bg-card">
                  <img src={p.dataUrl} alt={p.caption ?? "Photo"} className="aspect-square w-full object-cover" />
                  <div className="p-3">
                    <p className="truncate text-lg font-bold">{p.caption ?? t("cf.untitled")}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {linked.length ? t("cf.linked", { names: linked.join(", ") }) : t("cf.notLinked")}
                    </p>
                    <div className="mt-2 flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 border-2"
                        onClick={() => setPhotoForm({ id: p._id, caption: p.caption ?? "", dataUrl: p.dataUrl, memberIds: [...(p.memberIds ?? [])] })}
                      >
                        <Pencil className="size-4" /> {t("common.edit")}
                      </Button>
                      <Button variant="outline" size="sm" className="h-8 border-2 text-destructive" onClick={() => { if (confirm(t("cf.removePhotoQ"))) void deletePhoto({ id: p._id }); }}>
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Member dialog */}
        {memberForm ? (
          <div
            className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-4 sm:p-6"
            onClick={() => setMemberForm(null)}
          >
            {/* Wrapper (not the card) centers content: tall dialogs grow
                downward inside the scrollable overlay, so the Save button is
                always reachable by scrolling — no clipped bottom on laptops. */}
            <div className="flex min-h-full items-start justify-center sm:items-center">
            <div className="w-full max-w-lg border-2 border-foreground bg-card p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold">{memberForm.id ? t("cf.editMemberT") : t("cf.addMemberT")}</h3>
                <Button variant="ghost" size="icon" onClick={() => setMemberForm(null)}><X className="size-5" /></Button>
              </div>
              <div className="mt-5 space-y-4">
                <div>
                  <label className="label-caps text-muted-foreground">{t("cf.nameL")}</label>
                  <Input className="mt-1 h-12 text-lg" value={memberForm.name} onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value })} placeholder={t("cf.namePh")} />
                </div>
                <div>
                  <label className="label-caps text-muted-foreground">{t("cf.relL")}</label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {RELATIONSHIP_CHIPS.map((r) => (
                      <button
                        key={r}
                        type="button"
                        className={cn(
                          "border-2 px-3 py-2 text-base font-semibold transition-colors",
                          memberForm.relationship === r
                            ? "border-swiss-red bg-swiss-red text-white"
                            : "border-foreground/40 hover:border-foreground",
                        )}
                        onClick={() => setMemberForm({ ...memberForm, relationship: r })}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                  <Input
                    className="mt-2 h-12 text-lg"
                    value={memberForm.relationship}
                    onChange={(e) => setMemberForm({ ...memberForm, relationship: e.target.value })}
                    placeholder={t("cf.relPh")}
                  />
                  <p className="mt-1 text-sm text-muted-foreground">{t("cf.relNote")}</p>
                </div>
                <div>
                  <label className="label-caps text-muted-foreground">{t("cf.photoL")}</label>
                  <select
                    className="mt-1 h-12 w-full border-2 border-foreground bg-background px-3 text-lg"
                    value={memberForm.photoId ?? ""}
                    onChange={(e) => setMemberForm({ ...memberForm, photoId: e.target.value || undefined })}
                  >
                    <option value="">{t("cf.noPhoto")}</option>
                    {(photos ?? []).map((p) => (
                      <option key={p._id} value={p._id}>{p.caption ?? "Photo"}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label-caps text-muted-foreground">{t("cf.notesL")}</label>
                  <Textarea className="mt-1 min-h-20 text-lg" value={memberForm.notes} onChange={(e) => setMemberForm({ ...memberForm, notes: e.target.value })} placeholder={t("cf.notesPh")} />
                </div>
                {memberForm.id ? (
                  <div>
                    <label className="label-caps flex items-center gap-2 text-muted-foreground">
                      <Video className="size-4" /> {t("cf.videoL")}
                    </label>
                    <p className="mt-1 text-sm text-muted-foreground">{t("cf.videoHint")}</p>
                    <input
                      ref={videoRef}
                      type="file"
                      accept="video/*"
                      className="hidden"
                      onChange={(e) => {
                        void uploadVideo(memberForm.id!, e.target.files?.[0]);
                        e.target.value = "";
                      }}
                    />
                    {(() => {
                      const current = members?.find((m) => m._id === memberForm.id);
                      return current?.videoUrl ? (
                        <video src={current.videoUrl} controls className="mt-2 max-h-44 w-full border-2 border-foreground bg-black" />
                      ) : null;
                    })()}
                    <div className="mt-2 flex gap-2">
                      <Button
                        variant="outline"
                        className="h-11 flex-1 border-2 text-base"
                        disabled={videoBusy}
                        onClick={() => videoRef.current?.click()}
                      >
                        <Upload className="size-5" />
                        {videoBusy ? t("cf.uploading") : t("cf.chooseVideo")}
                      </Button>
                      {members?.find((m) => m._id === memberForm.id)?.videoUrl ? (
                        <Button
                          variant="outline"
                          className="h-11 border-2 text-base text-destructive"
                          disabled={videoBusy}
                          onClick={() => {
                            if (confirm("Remove this video clip?")) {
                              void removeVideo({ memberId: memberForm.id as never });
                            }
                          }}
                        >
                          <Trash2 className="size-5" />
                        </Button>
                      ) : null}
                    </div>
                    {videoError ? <p className="mt-2 text-sm text-destructive">{videoError}</p> : null}
                  </div>
                ) : (
                  <p className="border-l-2 border-swiss-blue pl-3 text-sm text-muted-foreground">
                    {t("cf.saveFirst")}
                  </p>
                )}
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" className="h-12 border-2 px-6 text-base" onClick={() => setMemberForm(null)}>{t("common.cancel")}</Button>
                  <Button className="h-12 px-6 text-base" disabled={saving || !memberForm.name.trim() || !memberForm.relationship.trim()} onClick={submitMember}>
                    {t("cf.saveMember")}
                  </Button>
                </div>
              </div>
            </div>
            </div>
          </div>
        ) : null}

        {/* Photo dialog */}
        {photoForm ? (
          <div
            className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-4 sm:p-6"
            onClick={() => setPhotoForm(null)}
          >
            <div className="flex min-h-full items-start justify-center sm:items-center">
            <div className="w-full max-w-lg border-2 border-foreground bg-card p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold">{photoForm.id ? t("cf.editPhotoT") : t("cf.addPhotoT")}</h3>
                <Button variant="ghost" size="icon" onClick={() => setPhotoForm(null)}><X className="size-5" /></Button>
              </div>
              <div className="mt-5 space-y-4">
                <div>
                  <label className="label-caps text-muted-foreground">{t("cf.imageL")}</label>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onPickFile(e.target.files?.[0])} />
                  <Button variant="outline" className="mt-1 h-12 w-full border-2 text-base" onClick={() => fileRef.current?.click()}>
                    <Upload className="size-5" /> {photoForm.dataUrl ? t("cf.replaceImage") : t("cf.chooseImage")}
                  </Button>
                </div>
                {photoForm.dataUrl ? (
                  <img src={photoForm.dataUrl} alt="Preview" className="max-h-56 w-full border-2 border-foreground object-contain" />
                ) : null}
                <div>
                  <label className="label-caps text-muted-foreground">{t("cf.captionL")}</label>
                  <Input className="mt-1 h-12 text-lg" value={photoForm.caption} onChange={(e) => setPhotoForm({ ...photoForm, caption: e.target.value })} placeholder={t("cf.captionPh")} />
                </div>
                <div>
                  <label className="label-caps text-muted-foreground">{t("cf.whoL")}</label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(members ?? []).map((m) => {
                      const on = photoForm.memberIds.includes(m._id);
                      return (
                        <button
                          key={m._id}
                          type="button"
                          className={cn(
                            "border-2 px-3 py-2 text-base font-semibold",
                            on ? "border-swiss-red bg-swiss-red text-white" : "border-foreground/40 hover:border-foreground",
                          )}
                          onClick={() =>
                            setPhotoForm({
                              ...photoForm,
                              memberIds: on ? photoForm.memberIds.filter((x) => x !== m._id) : [...photoForm.memberIds, m._id],
                            })
                          }
                        >
                          {m.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" className="h-12 border-2 px-6 text-base" onClick={() => setPhotoForm(null)}>{t("common.cancel")}</Button>
                  <Button className="h-12 px-6 text-base" disabled={saving || !photoForm.dataUrl} onClick={submitPhoto}>{t("cf.savePhoto")}</Button>
                </div>
              </div>
            </div>
            </div>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
