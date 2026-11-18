import { enUS, ru, srLatn } from "date-fns/locale";
import { Dimensions } from "react-native";

export type PickerType = "year" | "month" | "day";

export type PickerIndexes = {
  year: number;
  month: number;
  day: number;
};

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export const ITEM_HEIGHT = 48;

export const VISIBLE_ITEMS = 5;

export const LIST_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

export const LIST_VERTICAL_PADDING = (LIST_HEIGHT - ITEM_HEIGHT) / 2;

export const DEFAULT_CARD_WIDTH = Math.min(SCREEN_WIDTH * 0.85, 360);

export const SCROLL_SETTLE_DELAY = 120;

export function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

export function createLocalDate(year: number, month: number, day: number) {
  return new Date(year, month, day, 12, 0, 0, 0);
}

export function normalizeDate(date: Date) {
  return createLocalDate(date.getFullYear(), date.getMonth(), date.getDate());
}

export function areDatesEqual(first: Date, second: Date) {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

export function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

export function clampDate(date: Date, minimumDate: Date, maximumDate: Date) {
  const normalizedDate = normalizeDate(date);
  const normalizedMinimumDate = normalizeDate(minimumDate);
  const normalizedMaximumDate = normalizeDate(maximumDate);

  if (normalizedDate.getTime() < normalizedMinimumDate.getTime()) {
    return normalizedMinimumDate;
  }

  if (normalizedDate.getTime() > normalizedMaximumDate.getTime()) {
    return normalizedMaximumDate;
  }

  return normalizedDate;
}

export function getDateLocale(language: string) {
  const normalizedLanguage = language.toLowerCase();

  if (normalizedLanguage.startsWith("ru")) {
    return ru;
  }

  if (normalizedLanguage.startsWith("sr")) {
    return srLatn;
  }

  return enUS;
}
