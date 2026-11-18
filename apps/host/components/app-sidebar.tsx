"use client";

import * as React from "react";
import {
  IconCamera,
  IconChartBar,
  IconFileAi,
  IconFileDescription,
  IconHelp,
  IconSearch,
  IconSettings,
  IconCalendarEvent,
  IconMapPin,
  IconMap,
  IconFlag,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useUser } from "@clerk/nextjs";

import { NavMain } from "@/components/nav-main";
import { NavSecondary } from "@/components/nav-secondary";
import { NavUser } from "@/components/nav-user";
import Logo from "@/components/common/logo";
import { getGuestReportsSummary } from "@/lib/api-client";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import "../i18n";
import Link from "next/link";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { t } = useTranslation();
  const { user } = useUser();
  // Reports waiting for review, for Tulum admins; null hides the link
  // (the API refuses everyone else).
  const [pendingReports, setPendingReports] = React.useState<number | null>(
    null,
  );

  React.useEffect(() => {
    let active = true;
    getGuestReportsSummary()
      .then((summary) => {
        if (active) setPendingReports(summary ? summary.pending : null);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const data = {
    user: {
      name: user?.fullName || user?.firstName || "User",
      email: user?.primaryEmailAddress?.emailAddress || "",
      avatar: user?.imageUrl || "",
    },
    navMain: [
      {
        title: t("dashboard.navigation.statistics") || "Statistics",
        url: "/dashboard",
        icon: IconChartBar,
      },
      {
        title: t("dashboard.navigation.events") || "Events",
        url: "/events",
        icon: IconCalendarEvent,
      },
      {
        title: t("dashboard.navigation.venues") || "Venues",
        url: "/venues",
        icon: IconMapPin,
      },
      {
        title: t("dashboard.navigation.maps") || "Live Map",
        url: "/map",
        icon: IconMap,
      },
      ...(pendingReports !== null
        ? [
            {
              title: t("dashboard.navigation.guestReports"),
              url: "/reports",
              icon: IconFlag,
              badge: pendingReports,
            },
          ]
        : []),
      // {
      //   title: t("dashboard.navigation.team"),
      //   url: "#",
      //   icon: IconUsers,
      // },
    ],
    navClouds: [
      {
        title: t("dashboard.navigation.capture"),
        icon: IconCamera,
        isActive: true,
        url: "#",
        items: [
          {
            title: t("dashboard.navigation.activeProposals"),
            url: "#",
          },
          {
            title: t("dashboard.navigation.archived"),
            url: "#",
          },
        ],
      },
      {
        title: t("dashboard.navigation.proposal"),
        icon: IconFileDescription,
        url: "#",
        items: [
          {
            title: t("dashboard.navigation.activeProposals"),
            url: "#",
          },
          {
            title: t("dashboard.navigation.archived"),
            url: "#",
          },
        ],
      },
      {
        title: t("dashboard.navigation.prompts"),
        icon: IconFileAi,
        url: "#",
        items: [
          {
            title: t("dashboard.navigation.activeProposals"),
            url: "#",
          },
          {
            title: t("dashboard.navigation.archived"),
            url: "#",
          },
        ],
      },
    ],
    navSecondary: [
      {
        title: t("dashboard.navigation.settings"),
        url: "#",
        icon: IconSettings,
      },
      {
        title: t("dashboard.navigation.getHelp"),
        url: "#",
        icon: IconHelp,
      },
      {
        title: t("dashboard.navigation.search"),
        url: "#",
        icon: IconSearch,
      },
    ],
  };
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <Link href="#">
                <Logo className="fill-primary !size-5" />
                <span className="text-base font-semibold">Tulum</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  );
}
