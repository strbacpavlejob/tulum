import { useAppTheme } from "@/hooks/useAppTheme";
import { fetchMyProfile, fetchSettings } from "@/lib/api";
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
import React, { useEffect } from "react";
import { View } from "react-native";

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

  const { user, settings, setUser, setSettings } = useStore();

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
          setSettings({
            ...settings,
            language: remoteSettings.language,
            theme: remoteSettings.theme,
          });
        }
      })
      .catch(console.error);
  }, [getToken, setSettings, setUser, settings, user?.id, userId]);

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
