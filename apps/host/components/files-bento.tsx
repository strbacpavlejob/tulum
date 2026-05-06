import { Marquee } from "./ui/marquee";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export default function FilesBento() {
  const { t } = useTranslation();

  const files = [
    {
      name: t("landingpage.features.reports.files.attendance.name"),
      body: t("landingpage.features.reports.files.attendance.body"),
    },
    {
      name: t("landingpage.features.reports.files.demographics.name"),
      body: t("landingpage.features.reports.files.demographics.body"),
    },
    {
      name: t("landingpage.features.reports.files.peakHours.name"),
      body: t("landingpage.features.reports.files.peakHours.body"),
    },
    {
      name: t("landingpage.features.reports.files.returning.name"),
      body: t("landingpage.features.reports.files.returning.body"),
    },
    {
      name: t("landingpage.features.reports.files.revenue.name"),
      body: t("landingpage.features.reports.files.revenue.body"),
    },
  ];
  return (
    <Marquee
      pauseOnHover
      className="absolute top-10 [mask-image:linear-gradient(to_top,transparent_40%,#000_100%)] [--duration:20s]"
    >
      {files.map((f, idx) => (
        <figure
          key={idx}
          className={cn(
            "relative w-32 cursor-pointer overflow-hidden rounded-xl border p-4",
            "border-gray-950/[.1] bg-gray-950/[.01] hover:bg-gray-950/[.05]",
            "dark:border-gray-50/[.1] dark:bg-gray-50/[.10] dark:hover:bg-gray-50/[.15]",
            "transform-gpu blur-[1px] transition-all duration-300 ease-out hover:blur-none",
          )}
        >
          <div className="flex flex-row items-center gap-2">
            <div className="flex flex-row space-between space-x-2 items-center justify-center">
              <figcaption className="text-sm font-medium dark:text-white">
                {f.name}
              </figcaption>
            </div>
          </div>

          <blockquote className="mt-2 text-xs">
            {f.body}
            {f.body}
          </blockquote>
        </figure>
      ))}
    </Marquee>
  );
}
