import React, { useRef, useState } from "react";
import { PanResponder, View } from "react-native";

type RangeValues = {
  min: number;
  max: number;
};

type RangeSliderProps = {
  minimumValue: number;
  maximumValue: number;
  values: RangeValues;
  onValueChange: (values: RangeValues) => void;
  minimumTrackColor?: string;
  maximumTrackColor?: string;
  thumbColor?: string;
  thumbBorderColor?: string;
};

const THUMB_SIZE = 22;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

export function RangeSlider({
  minimumValue,
  maximumValue,
  values,
  onValueChange,
  minimumTrackColor = "#a77aff",
  maximumTrackColor = "#5a506b",
  thumbColor = "#a77aff",
  thumbBorderColor = "#24202e",
}: RangeSliderProps) {
  const [trackWidth, setTrackWidth] = useState(0);
  const usableTrackWidthRef = useRef(1);
  const valuesRef = useRef(values);
  const dragStartValuesRef = useRef(values);
  const onValueChangeRef = useRef(onValueChange);

  const min = clamp(values.min, minimumValue, maximumValue);
  const max = clamp(values.max, min, maximumValue);
  valuesRef.current = { min, max };
  onValueChangeRef.current = onValueChange;

  const usableTrackWidth = Math.max(trackWidth - THUMB_SIZE, 1);
  usableTrackWidthRef.current = usableTrackWidth;

  const updateValues = (nextValues: RangeValues) => {
    valuesRef.current = nextValues;
    onValueChangeRef.current(nextValues);
  };

  const minimumPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        dragStartValuesRef.current = valuesRef.current;
      },
      onPanResponderMove: (_, gestureState) => {
        const { max: currentMax } = valuesRef.current;
        const delta =
          (gestureState.dx / usableTrackWidthRef.current) *
          (maximumValue - minimumValue);
        const nextMin = Math.min(
          currentMax,
          clamp(
            Math.round(dragStartValuesRef.current.min + delta),
            minimumValue,
            maximumValue,
          ),
        );
        updateValues({ min: nextMin, max: currentMax });
      },
    }),
  ).current;

  const maximumPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        dragStartValuesRef.current = valuesRef.current;
      },
      onPanResponderMove: (_, gestureState) => {
        const { min: currentMin } = valuesRef.current;
        const delta =
          (gestureState.dx / usableTrackWidthRef.current) *
          (maximumValue - minimumValue);
        const nextMax = Math.max(
          currentMin,
          clamp(
            Math.round(dragStartValuesRef.current.max + delta),
            minimumValue,
            maximumValue,
          ),
        );
        updateValues({ min: currentMin, max: nextMax });
      },
    }),
  ).current;

  const valueRange = maximumValue - minimumValue;
  const minPercent =
    valueRange === 0 ? 0 : (min - minimumValue) / valueRange;
  const maxPercent =
    valueRange === 0 ? 0 : (max - minimumValue) / valueRange;
  const thumbOffset = THUMB_SIZE / 2;

  return (
    <View
      className="h-10 justify-center"
      onLayout={(event) => {
        const width = event.nativeEvent.layout.width;
        setTrackWidth(width);
      }}
    >
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: thumbOffset,
          right: thumbOffset,
          height: 4,
          borderRadius: 999,
          backgroundColor: maximumTrackColor,
        }}
      />
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: thumbOffset + minPercent * usableTrackWidth,
          right: thumbOffset + (1 - maxPercent) * usableTrackWidth,
          height: 4,
          borderRadius: 999,
          backgroundColor: minimumTrackColor,
        }}
      />
      <View
        {...minimumPanResponder.panHandlers}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="Minimum age"
        accessibilityValue={{
          min: minimumValue,
          max: maximumValue,
          now: min,
        }}
        accessibilityActions={[
          { name: "increment", label: "Increase minimum age" },
          { name: "decrement", label: "Decrease minimum age" },
        ]}
        onAccessibilityAction={(event) => {
          const current = valuesRef.current;
          const step = event.nativeEvent.actionName === "increment" ? 1 : -1;
          const nextMin = Math.min(
            current.max,
            clamp(current.min + step, minimumValue, maximumValue),
          );
          updateValues({ min: nextMin, max: current.max });
        }}
        style={{
          position: "absolute",
          left: thumbOffset + minPercent * usableTrackWidth,
          width: THUMB_SIZE,
          height: THUMB_SIZE,
          borderRadius: THUMB_SIZE / 2,
          backgroundColor: thumbColor,
          borderWidth: 2,
          borderColor: thumbBorderColor,
          transform: [{ translateX: -thumbOffset }],
          zIndex: 1,
        }}
      />
      <View
        {...maximumPanResponder.panHandlers}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="Maximum age"
        accessibilityValue={{
          min: minimumValue,
          max: maximumValue,
          now: max,
        }}
        accessibilityActions={[
          { name: "increment", label: "Increase maximum age" },
          { name: "decrement", label: "Decrease maximum age" },
        ]}
        onAccessibilityAction={(event) => {
          const current = valuesRef.current;
          const step = event.nativeEvent.actionName === "increment" ? 1 : -1;
          const nextMax = Math.max(
            current.min,
            clamp(current.max + step, minimumValue, maximumValue),
          );
          updateValues({ min: current.min, max: nextMax });
        }}
        style={{
          position: "absolute",
          left: thumbOffset + maxPercent * usableTrackWidth,
          width: THUMB_SIZE,
          height: THUMB_SIZE,
          borderRadius: THUMB_SIZE / 2,
          backgroundColor: thumbColor,
          borderWidth: 2,
          borderColor: thumbBorderColor,
          transform: [{ translateX: -thumbOffset }],
          zIndex: 2,
        }}
      />
    </View>
  );
}
