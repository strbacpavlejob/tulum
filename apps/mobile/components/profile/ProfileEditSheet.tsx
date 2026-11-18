import type { Dispatch, SetStateAction, RefObject } from "react";
import { BottomSheetModal, BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { View } from "react-native";
import { Check } from "lucide-react-native";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "react-i18next";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMemo } from "react";
import { renderSheetBackdrop } from "./SheetBackdrop";
import type { EditConfig } from "@/constants/options";

interface ProfileEditSheetProps {
  editSheetRef: RefObject<BottomSheetModal | null>;
  setEditConfig: Dispatch<SetStateAction<EditConfig | null>>;
  editConfig: EditConfig | null;
  singleValue: string;
  setSingleValue: Dispatch<SetStateAction<string>>;
  multiValues: string[];
  toggleMultiValue: (value: string) => void;
  confirmEdit: () => void;
  textValue: string;
  setTextValue: Dispatch<SetStateAction<string>>;
}

export function ProfileEditSheet({
  editSheetRef,
  setEditConfig,
  editConfig,
  singleValue,
  setSingleValue,
  multiValues,
  toggleMultiValue,
  confirmEdit,
  textValue,
  setTextValue,
}: ProfileEditSheetProps) {
  const editSnapPoints = useMemo(() => ["50%", "85%"], []);
  const { t } = useTranslation();
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  return (
    <BottomSheetModal
      ref={editSheetRef}
      snapPoints={editSnapPoints}
      keyboardBlurBehavior="restore"
      backdropComponent={renderSheetBackdrop}
      backgroundStyle={{
        backgroundColor: theme.backgroundPopover,
      }}
      handleIndicatorStyle={{
        backgroundColor: theme.gray5,
      }}
      onDismiss={() => {
        setEditConfig(null);
      }}
    >
      <BottomSheetScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 20,
        }}
      >
        {editConfig ? (
          <>
            <Text
              style={{
                marginTop: 4,
                marginBottom: 16,
                fontSize: 18,
                fontWeight: "700",
                color: theme.colorStrong,
              }}
            >
              {editConfig.title}
            </Text>

            {editConfig.type === "single"
              ? (editConfig.options ?? []).map((option) => {
                  const selected = singleValue === option.value;

                  return (
                    <Button
                      key={option.value}
                      variant="ghost"
                      onPress={() => {
                        setSingleValue(option.value);
                        editConfig.onSave(option.value);
                        editSheetRef.current?.close();
                        setEditConfig(null);
                      }}
                      // sm:h-auto too: the button's sm:h-9 would cut off a
                      // description on screens 640 px and wider.
                      className="mb-0.5 h-auto w-full justify-between rounded-xl px-3 py-3.5 sm:h-auto"
                      style={
                        selected
                          ? {
                              backgroundColor: theme.color025,
                            }
                          : undefined
                      }
                    >
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            textAlign: "left",
                            fontSize: 16,
                            color: selected ? theme.color : theme.colorStrong,
                          }}
                        >
                          {t(option.name)}
                        </Text>
                        {option.description ? (
                          <Text
                            style={{
                              marginTop: 2,
                              textAlign: "left",
                              fontSize: 13,
                              lineHeight: 18,
                              color: theme.colorMuted,
                            }}
                          >
                            {t(option.description)}
                          </Text>
                        ) : null}
                      </View>

                      {selected ? (
                        <Check size={18} color={theme.color} />
                      ) : null}
                    </Button>
                  );
                })
              : null}

            {editConfig.type === "multi" ? (
              <>
                {(editConfig.options ?? []).map((option) => {
                  const selected = multiValues.includes(option.value);

                  return (
                    <Button
                      key={option.value}
                      variant="ghost"
                      onPress={() => {
                        toggleMultiValue(option.value);
                      }}
                      className="mb-0.5 h-auto w-full justify-between rounded-xl px-3 py-3.5"
                      style={
                        selected
                          ? {
                              backgroundColor: theme.color025,
                            }
                          : undefined
                      }
                    >
                      <Text
                        style={{
                          flex: 1,
                          textAlign: "left",
                          fontSize: 16,
                          color: selected ? theme.color : theme.colorStrong,
                        }}
                      >
                        {t(option.name)}
                      </Text>

                      {selected ? (
                        <Check size={18} color={theme.color} />
                      ) : null}
                    </Button>
                  );
                })}

                <Button onPress={confirmEdit} className="mt-4 w-full">
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "700",
                      color: "#fff",
                    }}
                  >
                    {t("confirm")}
                  </Text>
                </Button>
              </>
            ) : null}

            {editConfig.type === "text" ? (
              <>
                <Textarea
                  inBottomSheet
                  value={textValue}
                  onChangeText={setTextValue}
                  placeholder={`${editConfig.title}…`}
                  autoFocus
                  className="min-h-[100px]"
                />

                <Button onPress={confirmEdit} className="mt-3 w-full">
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "700",
                      color: "#fff",
                    }}
                  >
                    {t("confirm")}
                  </Text>
                </Button>
              </>
            ) : null}
          </>
        ) : null}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}
