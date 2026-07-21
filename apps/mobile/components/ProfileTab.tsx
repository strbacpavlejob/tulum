import ProfileInfoView, {
  type ProfileInfoEditCallbacks,
  type ProfileInfoField,
} from "@/components/ProfileInfoView";
import { TabsContent } from "@/components/ui/tabs";
import { User } from "@/types/user";
import React from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type ProfileEditCallbacks = ProfileInfoEditCallbacks;

type ProfileTabProps = {
  user: User;
  profileFields: ProfileInfoField[];
  editCallbacks: ProfileEditCallbacks;
};

export default function ProfileTab({
  user,
  profileFields,
  editCallbacks,
}: ProfileTabProps) {
  const insets = useSafeAreaInsets();

  return (
    <TabsContent value="profile" className="flex-1">
      <ScrollView
        className="flex-1 bg-light-background dark:bg-dark-background"
        contentContainerStyle={{
          paddingBottom: insets.bottom + 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View className="mx-4 mt-2">
          <ProfileInfoView
            user={user}
            profileFields={profileFields}
            editCallbacks={editCallbacks}
          />
        </View>
      </ScrollView>
    </TabsContent>
  );
}
