import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { X as IconX } from "lucide-react-native";
import React, { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import type { TextInput as RNTextInput } from "react-native";
import { Pressable, View } from "react-native";

type TagsState = {
  tag: string;
  tagsArray: string[];
};

type TagsInputRef = {
  focus: () => void;
  blur: () => void;
  clear: () => void;
  isFocused: () => boolean;
  setNativeProps: (nativeProps: Record<string, any>) => void;
};

type Props = {
  disabled?: boolean;
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
  customElement?: React.ReactNode;
  label?: string;
  tags: TagsState;
  updateState: (next: TagsState) => void;
  keysForTag?: string;
  keysForTagsArray?: string[];
  containerProps?: any;
  inputContainerProps?: any;
  inputProps?: any;
  leftElementContainerProps?: any;
  rightElementContainerProps?: any;
  labelProps?: any;
  tagProps?: any;
  tagTextProps?: any;
  deleteIconContainerProps?: any;
  deleteElement?: React.ReactNode;
};

const TagsInput = forwardRef<TagsInputRef, Props>((props, ref) => {
  const {
    leftElement,
    rightElement,
    label,
    tags,
    updateState,
    keysForTag = " ",
    keysForTagsArray,
    customElement,
    disabled,
    deleteElement,
  } = props;

  const inputRef = useRef<RNTextInput>(null);

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
    blur: () => inputRef.current?.blur(),
    clear: () => {
      inputRef.current?.clear?.();
      updateState({ tag: "", tagsArray: tags.tagsArray });
    },
    isFocused: () => !!inputRef.current?.isFocused?.(),
    setNativeProps: (nativeProps) =>
      inputRef.current?.setNativeProps?.(nativeProps),
  }));

  const delimiterRegex = useMemo(() => {
    if (!keysForTagsArray || keysForTagsArray.length === 0) return null;
    const escaped = keysForTagsArray.map((k) =>
      (k + "").replace(/([\\.+*?[^]$(){}=!<>|:])/g, "\\$1"),
    );
    return new RegExp(escaped.join("|"));
  }, [keysForTagsArray]);

  const commitTag = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    const nextArray = [...new Set([...tags.tagsArray, trimmed])];
    updateState({ tag: "", tagsArray: nextArray });
    inputRef.current?.clear?.();
  };

  const onEndEditing = () => {
    if (tags.tag) commitTag(tags.tag);
  };

  const onChangeText = (text: string) => {
    if (delimiterRegex) {
      if (delimiterRegex.test(text)) {
        if (keysForTagsArray?.includes(text)) {
          updateState({ tag: "", tagsArray: tags.tagsArray });
          inputRef.current?.clear?.();
          return;
        }
        const tagCandidate = text.replace(delimiterRegex, "");
        commitTag(tagCandidate);
        return;
      }
      updateState({ tag: text, tagsArray: tags.tagsArray });
      return;
    }

    const delimiter = typeof keysForTag === "string" ? keysForTag : " ";
    if (text.includes(delimiter)) {
      if (text === delimiter) return;
      const candidate = text.replace(delimiter, "");
      commitTag(candidate);
      return;
    }
    updateState({ tag: text, tagsArray: tags.tagsArray });
  };

  const deleteTagAt = (idx: number) => {
    const next = [...tags.tagsArray];
    next.splice(idx, 1);
    updateState({ tag: tags.tag, tagsArray: next });
  };

  return (
    <View className="w-full">
      {!!label && <Text className="text-sm mt-3 mb-[-4px]">{label}</Text>}

      <View className="flex-row items-center mt-2 border border-gray-400 rounded-lg px-2 py-1.5 gap-2">
        {!!leftElement && <View>{leftElement}</View>}

        <Input
          ref={inputRef}
          className="flex-1 h-auto border-0 shadow-none"
          editable={!disabled}
          value={tags.tag}
          onChangeText={onChangeText}
          onEndEditing={onEndEditing}
          style={{ backgroundColor: "transparent" }}
        />

        {!!rightElement && <View>{rightElement}</View>}
      </View>

      {customElement ?? null}

      <View className="flex-row flex-wrap mt-2">
        {tags.tagsArray.map((item, idx) => (
          <View
            key={`${item}-${idx}`}
            className="flex-row items-center h-7 px-2.5 py-1 rounded-xl bg-gray-200 gap-2 my-1.5 mr-1.5"
          >
            <Text className="text-xs text-gray-700">{item}</Text>
            <Pressable
              accessibilityLabel={`Remove ${item}`}
              onPress={() => deleteTagAt(idx)}
            >
              {deleteElement ?? <IconX size={12} color="#6b7280" />}
            </Pressable>
          </View>
        ))}
      </View>
    </View>
  );
});

TagsInput.displayName = "TagsInput";

export type { TagsInputRef, TagsState };
export default TagsInput;
