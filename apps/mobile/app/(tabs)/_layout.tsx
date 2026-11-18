import { useAppTheme } from "@/hooks/use-app-theme";
import { useInboxSocket } from "@/hooks/use-inbox-socket";
import Logo from "@/components/illustrations/logo";
import { fetchMyMatches, fetchMyProfile, fetchSettings } from "@/lib/api";
import { getUnreadChatsCount } from "@/lib/inbox-unread";
import useStore from "@/store/use-store";
import { useAuth } from "@clerk/expo";
import { Redirect, Tabs } from "expo-router";
import {
  Map,
  MessageCircle,
  Tickets,
  User,
} from "lucide-react-native";
import React, { useCallback, useEffect, useRef } from "react";
import { AppState, View } from "react-native";

/** While the socket is down, the unread badge is read this often instead. */
const INBOX_POLL_MS = 60_000;
/** Pushes this close together (a lively chat) are read once. */
const INBOX_PUSH_DELAY_MS = 1_500;

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
  const theme = useAppTheme();

  return (
    <View className={focused ? "opacity-100" : "opacity-60"}>
      <IconComponent
        size={size}
        color={focused ? theme.primary : theme.colorStrong}
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
    bumpInboxVersion,
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
            defaultVenueType: remoteSettings.default_venue_type ?? undefined,
          });
        }
      })
      .catch(console.error);
  }, [getToken, setSettings, setUser, user?.id, userId]);

  const getTokenRef = useRef(getToken);
  const refreshInFlightRef = useRef(false);
  // A refresh asked for while one runs runs again after it, since the one
  // running may have read the inbox before the change.
  const refreshAgainRef = useRef(false);
  const unreadCountRef = useRef(inboxUnreadCount);

  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  useEffect(() => {
    unreadCountRef.current = inboxUnreadCount;
  }, [inboxUnreadCount]);

  const refreshInboxUnread = useCallback(async () => {
    if (!userId) return;
    if (refreshInFlightRef.current) {
      refreshAgainRef.current = true;
      return;
    }
    refreshInFlightRef.current = true;
    try {
      do {
        refreshAgainRef.current = false;
        const token = await getTokenRef.current();
        if (!token) return;
        const items = await fetchMyMatches(token);
        const unreadCount = await getUnreadChatsCount(items, userId);
        if (unreadCount !== unreadCountRef.current) {
          unreadCountRef.current = unreadCount;
          setInboxUnreadCount(unreadCount);
        }
      } while (refreshAgainRef.current);
    } catch {
      // Ignore transient network errors.
    } finally {
      refreshInFlightRef.current = false;
    }
  }, [setInboxUnreadCount, userId]);

  // New matches and messages are pushed over the socket instead of the
  // badge polling /matches/mine. A push also tells an open inbox to reload.
  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onInboxPush = useCallback(() => {
    if (pushTimerRef.current) return;
    pushTimerRef.current = setTimeout(() => {
      pushTimerRef.current = null;
      bumpInboxVersion();
      void refreshInboxUnread();
    }, INBOX_PUSH_DELAY_MS);
  }, [bumpInboxVersion, refreshInboxUnread]);
  useEffect(
    () => () => {
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    },
    [],
  );
  const socketConnected = useInboxSocket(userId, onInboxPush);

  useEffect(() => {
    // At start, and each time the socket connects or drops: pushes sent
    // while it was down are lost.
    void refreshInboxUnread();
    if (socketConnected) {
      // An open inbox reads what it missed too.
      bumpInboxVersion();
      return;
    }

    // While it is down, poll instead, but not while the app is hidden.
    const interval = setInterval(() => {
      if (AppState.currentState === "active") void refreshInboxUnread();
    }, INBOX_POLL_MS);
    return () => clearInterval(interval);
  }, [bumpInboxVersion, refreshInboxUnread, socketConnected]);

  useEffect(() => {
    const appStateSub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void refreshInboxUnread();
      }
    });
    return () => appStateSub.remove();
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
            <Logo
              className={focused ? "opacity-100" : "opacity-60"}
              color={focused ? theme.primary : theme.colorStrong}
              height={28}
              variant={focused ? "filled" : "outlined"}
              width={28}
            />
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
