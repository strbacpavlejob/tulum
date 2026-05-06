import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { XIcon } from "lucide-react";
import { Dispatch, SetStateAction, forwardRef, useState } from "react";
import { useTranslation } from "react-i18next";

type InputTagsProps = Omit<
  React.ComponentProps<"input">,
  "value" | "onChange"
> & {
  value: string[];
  onChange: Dispatch<SetStateAction<string[]>>;
  maxTags?: number;
};

export const InputTags = forwardRef<HTMLInputElement, InputTagsProps>(
  ({ value, onChange, maxTags = 3, ...props }, ref) => {
    const { t } = useTranslation();
    const [pendingDataPoint, setPendingDataPoint] = useState("");
    const [error, setError] = useState("");

    const addPendingDataPoint = () => {
      const trimmedValue = pendingDataPoint.trim();
      if (trimmedValue) {
        if (value.length >= maxTags) {
          setError(t("inputTags.maxReached", { max: maxTags }));
          return;
        }
        if (value.includes(trimmedValue)) {
          setError(t("inputTags.duplicate"));
          return;
        }
        const newDataPoints = new Set([...value, trimmedValue]);
        onChange(Array.from(newDataPoints));
        setPendingDataPoint("");
        setError("");
      }
    };

    return (
      <>
        <div className="flex">
          <Input
            value={pendingDataPoint}
            onChange={(e) => {
              setPendingDataPoint(e.target.value);
              setError("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addPendingDataPoint();
              } else if (e.key === "," || e.key === " ") {
                e.preventDefault();
                addPendingDataPoint();
              }
            }}
            className="rounded-r-none"
            {...props}
            ref={ref}
          />
          <Button
            type="button"
            variant="outline"
            className="rounded-l-none border border-l-0"
            onClick={addPendingDataPoint}
            disabled={
              value.length >= maxTags ||
              !pendingDataPoint.trim() ||
              value.includes(pendingDataPoint.trim())
            }
          >
            {t("inputTags.add")}
          </Button>
        </div>
        {error && <p className="text-sm text-destructive mt-1">{error}</p>}
        <div className=" rounded-md min-h-10 overflow-y-auto p-2 flex gap-2 flex-wrap items-center">
          {value.map((item: string, idx: number) => (
            <Badge key={idx} variant="outline">
              {item}
              <button
                type="button"
                className="w-3 ml-2"
                onClick={() => {
                  onChange(value.filter((i: string) => i !== item));
                  setError("");
                }}
              >
                <XIcon className="w-3" />
              </button>
            </Badge>
          ))}
        </div>
      </>
    );
  },
);

InputTags.displayName = "InputTags";
