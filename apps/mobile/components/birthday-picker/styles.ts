import { StyleSheet } from "react-native";
import { ITEM_HEIGHT, LIST_HEIGHT } from "./picker-dates";

export const styles = StyleSheet.create({
  pickerContent: {
    alignItems: "center",
  },
  columnsContainer: {
    width: "100%",
    height: LIST_HEIGHT,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  listContainer: {
    height: LIST_HEIGHT,
    overflow: "hidden",
  },
  itemContainer: {
    width: "100%",
    height: ITEM_HEIGHT,
    justifyContent: "center",
    alignItems: "center",
  },
  highlightContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
});
