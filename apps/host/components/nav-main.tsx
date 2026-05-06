"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { IconCirclePlusFilled, type Icon } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { CreateEventDialog } from "@/components/create-event-dialog";
import "../i18n";

export function NavMain({
  items,
}: {
  items: {
    title: string;
    url: string;
    icon?: Icon;
  }[];
}) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const handleQuickCreate = () => {
    setIsCreateOpen(true);
  };

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          <SidebarMenuItem className="flex items-center gap-2">
            <SidebarMenuButton
              tooltip={t("dashboard.navigation.quickCreate")}
              className="bg-primary text-white hover:bg-primary/90 hover:text-white active:bg-primary/90 active:text-white min-w-8 duration-200 ease-linear"
              onClick={handleQuickCreate}
            >
              <IconCirclePlusFilled />
              <span>{t("dashboard.navigation.quickCreate")}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarMenu>
          {items.map((item) => {
            const isActive = pathname === item.url;
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  tooltip={item.title}
                  asChild
                  isActive={isActive}
                >
                  <Link href={item.url}>
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>

      <CreateEventDialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />
    </SidebarGroup>
  );
}
