import { useRef, useState } from "react";
import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import type { EditConfig, SelectOption } from "@/constants/options";

/**
 * The bottom sheet that edits one profile or settings value: a single
 * choice, several choices or a text. The open* functions fill it and show
 * it; confirmEdit hands the value to the caller's onSave and closes it.
 */
export function useFieldEditSheet() {
  const editSheetRef = useRef<BottomSheetModal>(null);
  const [editConfig, setEditConfig] = useState<EditConfig | null>(null);

  const [singleValue, setSingleValue] = useState("");
  const [multiValues, setMultiValues] = useState<string[]>([]);
  const [textValue, setTextValue] = useState("");

  const openSingleSelect = (
    title: string,
    options: SelectOption[],
    current: string,
    onSave: (value: string) => void,
  ) => {
    setSingleValue(current);

    setEditConfig({
      title,
      type: "single",
      options,
      onSave: (value) => {
        onSave(value as string);
      },
    });

    editSheetRef.current?.present();
  };

  const openMultiSelect = (
    title: string,
    options: SelectOption[],
    current: string[],
    onSave: (value: string[]) => void,
  ) => {
    setMultiValues([...current]);

    setEditConfig({
      title,
      type: "multi",
      options,
      onSave: (value) => {
        onSave(value as string[]);
      },
    });

    editSheetRef.current?.present();
  };

  const openTextEdit = (
    title: string,
    current: string,
    onSave: (value: string) => void,
  ) => {
    setTextValue(current);

    setEditConfig({
      title,
      type: "text",
      onSave: (value) => {
        onSave(value as string);
      },
    });

    editSheetRef.current?.present();
  };

  const confirmEdit = () => {
    if (!editConfig) {
      return;
    }

    if (editConfig.type === "single") {
      editConfig.onSave(singleValue);
    }

    if (editConfig.type === "multi") {
      editConfig.onSave(multiValues);
    }

    if (editConfig.type === "text") {
      editConfig.onSave(textValue);
    }

    editSheetRef.current?.close();
    setEditConfig(null);
  };

  const toggleMultiValue = (value: string) => {
    setMultiValues((currentValues) => {
      if (currentValues.includes(value)) {
        return currentValues.filter((currentValue) => currentValue !== value);
      }

      return [...currentValues, value];
    });
  };

  return {
    editSheetRef,
    editConfig,
    setEditConfig,
    singleValue,
    setSingleValue,
    multiValues,
    textValue,
    setTextValue,
    openSingleSelect,
    openMultiSelect,
    openTextEdit,
    confirmEdit,
    toggleMultiValue,
  };
}
