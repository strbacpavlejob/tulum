import { fetchMyProfile, fetchSettings } from "@/lib/api";
import useStore from "@/store/useStore";
import { useAuth } from "@clerk/expo";
import { useAppTheme } from "@/hooks/useAppTheme";
import { Redirect, Tabs } from "expo-router";
import {
  HeartPulse,
  Map,
  MessageCircle,
  Tickets,
  User,
} from "lucide-react-native";
import React, { useEffect } from "react";
import { Platform, View } from "react-native";

type IconProps = {
  icon: React.ElementType;
  color: string;
  size?: number;
  focused?: boolean;
};

const TabBarIcon: React.FC<IconProps> = ({
  icon: IconComponent,
  color,
  size = 28,
  focused = false,
}) => {
  return (
    <View style={{ opacity: focused ? 1 : 0.6 }}>
      <IconComponent
        className={
          focused
            ? "text-primary fill-primary"
            : "text-color-light-colorStrong dark:text-color-dark-colorStrong fill-gray-10"
        }
        size={size}
      />
    </View>
  );
};

export default function TabLayout() {
  const { isSignedIn, isLoaded, userId, getToken } = useAuth();
  const theme = useAppTheme();
  const { user, settings, setUser, setSettings } = useStore();

  useEffect(() => {
    // Re-fetch whenever userId changes or the store user lacks an id
    // (e.g. after onboarding sets a partial user without id/email).
    if (!userId || user?.id) return;
    getToken()
      .then((token) => {
        if (!token) throw new Error("No token");
        return Promise.all([
          fetchMyProfile(token, userId),
          fetchSettings(token, userId),
        ]);
      })
      .then(([profile, remote]) => {
        setUser(profile);
        if (remote) {
          setSettings({
            ...settings,
            language: remote.language,
            theme: remote.theme,
          });
        }
      })
      .catch(console.error);
  }, [userId]);

  if (!isLoaded) return null;
  if (!isSignedIn) return <Redirect href="/(auth)/sign-in" />;
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.color,
        headerShown: false,
        tabBarInactiveTintColor: theme.accentColor,
        tabBarShowLabel: false,
        tabBarStyle: Platform.select({
          default: {
            backgroundColor: theme.background,
            borderTopWidth: 0,
            height: 60,
            paddingBottom: 10,
            paddingTop: 10,
          },
        }),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon icon={Map} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="tickets"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon icon={Tickets} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="matches"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon icon={HeartPulse} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="inbox"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon icon={MessageCircle} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon icon={User} color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
