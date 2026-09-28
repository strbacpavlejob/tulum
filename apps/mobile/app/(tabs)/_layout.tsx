import { useAppTheme } from "@/hooks/useAppTheme";
import {
  fetchMyMatches,
  fetchMyProfile,
  fetchOrCreateChat,
  fetchSettings,
  type MatchListItem,
} from "@/lib/api";
import { getUnreadChatsCount } from "@/lib/inboxUnread";
import useStore from "@/store/useStore";
import { useAuth } from "@clerk/expo";
import { Redirect, Tabs } from "expo-router";
import {
  HeartPulse,
  Map,
  MessageCircle,
  Tickets,
  User,
} from "lucide-react-native";
import React, { useCallback, useEffect, useRef } from "react";
import { AppState, View } from "react-native";

type IconProps = {
  icon: React.ElementType;
  size?: number;
  focused?: boolean;
};

const TabBarIcon: React.FC<IconProps> = ({
  icon: IconComponent,
  size = 28,
  focused = false,
}) => {
  return (
    <View className={focused ? "opacity-100" : "opacity-60"}>
      <IconComponent
        size={size}
        className={
          focused
            ? "fill-light-primary text-light-primary dark:fill-dark-primary dark:text-dark-primary"
            : "fill-light-gray10 text-light-colorStrong dark:fill-dark-gray10 dark:text-dark-colorStrong"
        }
      />
    </View>
  );
};

export default function TabLayout() {
  const { isSignedIn, isLoaded, userId, getToken } = useAuth();
  const theme = useAppTheme();

  const {
    user,
    settings,
    setUser,
    setSettings,
    inboxUnreadCount,
    setInboxUnreadCount,
  } = useStore();

  useEffect(() => {
    // Re-fetch whenever userId changes or the stored user lacks an ID.
    // This can happen after onboarding stores a partial user.
    if (!userId || user?.id) return;

    getToken()
      .then((token) => {
        if (!token) {
          throw new Error("No authentication token available");
        }

        return Promise.all([
          fetchMyProfile(token, userId),
          fetchSettings(token, userId),
        ]);
      })
      .then(([profile, remoteSettings]) => {
        setUser(profile);

        if (remoteSettings) {
          const currentSettings = useStore.getState().settings;
          setSettings({
            ...currentSettings,
            language: remoteSettings.language,
            theme: remoteSettings.theme,
          });
        }
      })
      .catch(console.error);
  }, [getToken, setSettings, setUser, user?.id, userId]);

  const getTokenRef = useRef(getToken);
  const refreshInFlightRef = useRef(false);
  const unreadCountRef = useRef(inboxUnreadCount);

  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  useEffect(() => {
    unreadCountRef.current = inboxUnreadCount;
  }, [inboxUnreadCount]);

  const refreshInboxUnread = useCallback(async () => {
    if (!userId || refreshInFlightRef.current) return;
    refreshInFlightRef.current = true;
    try {
      const token = await getTokenRef.current();
      if (!token) return;
      const items = await fetchMyMatches(token);

      const hydratedItems: MatchListItem[] = await Promise.all(
        items.map(async (item) => {
          const hasActivityFromMatches =
            item.has_messages ||
            Boolean(item.last_message) ||
            Boolean(item.chat_id);
          if (hasActivityFromMatches) return item;

          try {
            const opened = await fetchOrCreateChat(item.id, token);
            const last = opened.messages[opened.messages.length - 1];
            if (!last) return item;

            return {
              ...item,
              chat_id: opened.chat.id,
              has_messages: true,
              last_message: {
                id: String(last.id),
                text: last.text,
                sender_id: last.sender_id,
                sent_at: last.sent_at,
              },
            };
          } catch {
            return item;
          }
        }),
      );

      const unreadCount = await getUnreadChatsCount(hydratedItems, userId);
      if (unreadCount !== unreadCountRef.current) {
        unreadCountRef.current = unreadCount;
        setInboxUnreadCount(unreadCount);
      }
    } catch {
      // Ignore transient network errors.
    } finally {
      refreshInFlightRef.current = false;
    }
  }, [setInboxUnreadCount, userId]);

  useEffect(() => {
    void refreshInboxUnread();

    const interval = setInterval(() => {
      void refreshInboxUnread();
    }, 15000);

    const appStateSub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void refreshInboxUnread();
      }
    });

    return () => {
      clearInterval(interval);
      appStateSub.remove();
    };
  }, [refreshInboxUnread]);

  if (!isLoaded) {
    return null;
  }

  if (!isSignedIn) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: theme.background,
          borderTopWidth: 0,
          elevation: 0,
          height: 60,
          paddingBottom: 10,
          paddingTop: 10,
          shadowOpacity: 0,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon icon={Map} focused={focused} />
          ),
        }}
      />

      <Tabs.Screen
        name="tickets"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon icon={Tickets} focused={focused} />
          ),
        }}
      />

      <Tabs.Screen
        name="matches"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon icon={HeartPulse} focused={focused} />
          ),
        }}
      />

      <Tabs.Screen
        name="inbox"
        options={{
          tabBarBadge: inboxUnreadCount > 0 ? "" : undefined,
          tabBarBadgeStyle: {
            backgroundColor: "#ef4444",
            minWidth: 8,
            height: 8,
            borderRadius: 4,
            marginTop: 2,
          },
          tabBarIcon: ({ focused }) => (
            <TabBarIcon icon={MessageCircle} focused={focused} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon icon={User} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
