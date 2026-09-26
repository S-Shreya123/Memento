import { AppShell, useWorkspace, HELPER_ROLES } from "@/components/smriti";
import { useLanguage } from "@/hooks/use-language";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { Phone } from "lucide-react";
import { cn } from "@/lib/utils";

export default function PatientHelpers() {
  const { ready } = useWorkspace();
  const { t } = useLanguage();
  const helpers = useQuery(api.smriti.getHelpers, ready ? {} : "skip");

  return (
    <AppShell role="patient">
      <div className="swiss-container max-w-4xl py-10">
        <h1 className="type-display text-4xl md:text-5xl">{t("ph.title")}</h1>
        <p className="mt-3 text-lg text-muted-foreground">{t("ph.sub")}</p>

        {helpers === undefined ? (
          <p className="mt-10 text-xl text-muted-foreground">Loading…</p>
        ) : (
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {helpers.map((h) => {
              const role = HELPER_ROLES[h.role];
              return (
                <div key={h._id} className="border-2 border-foreground bg-card p-6">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-2xl font-bold">{h.name}</p>
                    <span className={cn("label-caps border-2 px-2 py-1", role.color)}>
                      {t(role.key)}
                    </span>
                  </div>
                  <p className="mt-2 text-lg text-muted-foreground">
                    {t("ph.speaks")} {h.languages.join(", ")}
                    {h.area ? ` · ${h.area}` : ""}
                  </p>
                  {h.notes ? <p className="mt-1 text-lg text-muted-foreground">{h.notes}</p> : null}
                  <a
                    href={`tel:${h.phone.replace(/\s/g, "")}`}
                    className="mt-4 flex h-14 items-center justify-center gap-3 border-2 border-foreground bg-background text-lg font-semibold transition-colors hover:bg-muted"
                  >
                    <Phone className="size-5" /> {h.phone}
                  </a>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
