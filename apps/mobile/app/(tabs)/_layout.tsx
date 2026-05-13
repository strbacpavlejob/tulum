import { useAppTheme } from "@/hooks/useAppTheme";
import { useAuth } from "@clerk/expo";
import { Redirect, Tabs } from "expo-router";
import {
  HeartPulse,
  Map,
  MessageCircle,
  Tickets,
  User,
} from "lucide-react-native";
import React from "react";
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
  const theme = useAppTheme();
  return (
    <View style={{ opacity: focused ? 1 : 0.6 }}>
      <IconComponent
        color={focused ? color : theme.background}
        size={size}
        fill={focused ? color : theme.gray10}
      />
    </View>
  );
};

export default function TabLayout() {
  const { isSignedIn, isLoaded } = useAuth();
  const theme = useAppTheme();
  if (!isLoaded) return null;
  if (!isSignedIn) return <Redirect href="/(auth)/login" />;
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
