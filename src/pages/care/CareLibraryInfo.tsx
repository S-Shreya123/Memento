import { AppShell, useWorkspace } from "@/components/smriti";
import { useLanguage } from "@/hooks/use-language";
import { Button } from "@/components/ui/button";
import { Link } from "react-router";
import { Library, Upload, Search } from "lucide-react";

export default function CareLibraryInfo() {
  const { summary } = useWorkspace();
  const { t } = useLanguage();
  const firstName = summary?.patient?.name?.split(" ")[0] ?? "your loved one";

  return (
    <AppShell role="caregiver" subtitle="Library">
      <div className="swiss-container max-w-4xl py-10">
        <p className="label-caps text-swiss-red">{t("cl.caps")}</p>
        <h1 className="type-display mt-2 text-4xl md:text-5xl">{t("cl.title")}</h1>
        <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
          {t("cl.sub", { name: firstName, first: firstName.split(" ")[0] })}
        </p>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <div className="border-2 border-foreground bg-card p-6">
            <Upload className="size-8 text-swiss-red" />
            <h2 className="mt-4 text-2xl font-bold">{t("cl.whatT")}</h2>
            <ul className="mt-3 space-y-2 text-lg text-muted-foreground">
              <li className="border-t-2 border-foreground/20 pt-2">{t("cl.li1")}</li>
              <li className="border-t-2 border-foreground/20 pt-2">{t("cl.li2")}</li>
              <li className="border-t-2 border-foreground/20 pt-2">{t("cl.li3")}</li>
              <li className="border-t-2 border-foreground/20 pt-2">{t("cl.li4")}</li>
            </ul>
            <Button asChild className="mt-6 h-12 px-5 text-base">
              <Link to="/care/family">{t("cl.addPhotos")}</Link>
            </Button>
          </div>
          <div className="border-2 border-foreground bg-card p-6">
            <Search className="size-8 text-swiss-blue" />
            <h2 className="mt-4 text-2xl font-bold">{t("cl.howT", { name: firstName })}</h2>
            <p className="mt-3 text-lg text-muted-foreground">
              {t("cl.howBody")}
            </p>
            <Button asChild variant="outline" className="mt-6 h-12 border-2 px-5 text-base">
              <Link to="/app/library">{t("cl.openPatient")}</Link>
            </Button>
          </div>
        </div>

        <div className="mt-10 flex items-center gap-3 border-t-2 border-foreground pt-6">
          <Library className="size-6 text-swiss-blue" />
          <p className="text-lg text-muted-foreground">
            {t("cl.footer")}
          </p>
        </div>
      </div>
    </AppShell>
  );
}
