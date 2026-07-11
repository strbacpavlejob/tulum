import LoadingIndicator from "@/components/loading-indicator";
import { fetchGuestMe } from "@/lib/api";
import { useAuth } from "@clerk/expo";
import { Redirect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, Text, View } from "react-native";

export default function Index() {
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const { t } = useTranslation();
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [checkError, setCheckError] = useState(false);

  const checkOnboarding = useCallback(() => {
    if (!isLoaded || !isSignedIn) return;
    setCheckError(false);
    setOnboardingChecked(false);

    getToken()
      .then((token) => {
        if (!token) throw new Error("No auth token");
        return fetchGuestMe(token);
      })
      .then(({ isOnboardingComplete }) => {
        console.log("[index] isOnboardingComplete:", isOnboardingComplete);
        setOnboardingComplete(isOnboardingComplete);
        setOnboardingChecked(true);
      })
      .catch((err) => {
        console.error("[index] fetchGuestMe failed:", err);
        setCheckError(true);
        setOnboardingChecked(true);
      });
  }, [isLoaded, isSignedIn]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    checkOnboarding();
  }, [checkOnboarding]);

  if (!isLoaded) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <LoadingIndicator />
      </View>
    );
  }

  if (!isSignedIn) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  if (!onboardingChecked) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <LoadingIndicator />
      </View>
    );
  }

  if (checkError) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <Text
          style={{
            color: "white",
            fontSize: 16,
            marginBottom: 16,
            textAlign: "center",
          }}
        >
          {t("serverUnreachable")}
        </Text>
        <Pressable
          onPress={checkOnboarding}
          style={{
            backgroundColor: "#6C47FF",
            paddingHorizontal: 24,
            paddingVertical: 12,
            borderRadius: 12,
          }}
        >
          <Text style={{ color: "white", fontWeight: "700" }}>
            {t("retry")}
          </Text>
        </Pressable>
      </View>
    );
  }

  return onboardingComplete ? (
    <Redirect href="/(tabs)" />
  ) : (
    <Redirect href="/(auth)/onboarding" />
  );
}
