"use client";

import { useState } from "react";
import type { UseFormSetValue } from "react-hook-form";
import { Check, Copy, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { EventFormData } from "./event-form";

interface EventAiAssistProps {
  title: string;
  description: string;
  tags: string[];
  venueName: string;
  /** The event's stored picture, for the AI to look at. */
  imageUrl: string | null;
  setValue: UseFormSetValue<EventFormData>;
}

/**
 * Copies a prompt for ChatGPT that rewrites the event's title, description
 * and tags, and fills the form from the JSON the host pastes back.
 */
export function EventAiAssist({
  title,
  description,
  tags,
  venueName,
  imageUrl,
  setValue,
}: EventAiAssistProps) {
  const { t } = useTranslation();
  const [aiPaste, setAiPaste] = useState("");
  const [aiCopied, setAiCopied] = useState(false);

  const handleGeneratePrompt = () => {
    const eventData = {
      title: title || "",
      description: description || "",
      tags: tags || [],
      venue_name: venueName,
    };

    const imageSection = imageUrl
      ? `\nEvent image (analyze it for additional context — visible text, vibe, colors, aesthetic):\n${imageUrl}\n`
      : "";

    const prompt = `You are helping improve an event listing for a nightlife app. Enhance the following event data to make it more engaging and appealing to potential guests.${imageSection ? " Use the event image below for extra context." : ""}

Return ONLY a valid JSON object with exactly these fields: "title" (string), "description" (string), "tags" (array of max 3 strings).
${imageSection}
Current event data:
${JSON.stringify(eventData, null, 2)}

Requirements:
- title: catchy and memorable, max 80 characters, emojis are allowed and encouraged
- description: engaging 2–4 sentences that capture the vibe and experience, emojis are allowed; if the original text contains any reservation information (phone numbers, contact details, booking instructions, links), preserve it exactly at the end of the description
- tags: max 3 relevant lowercase tags (e.g. "techno", "live music", "rooftop")
- IMPORTANT: write all fields in the same language as the original text. Supported languages are English, Serbian, and Russian. If the original text is not in one of these languages, default to English

Return ONLY the JSON object, no explanations or extra text.`;

    navigator.clipboard.writeText(prompt);
    setAiCopied(true);
    setTimeout(() => setAiCopied(false), 2500);
    window.open("https://chatgpt.com", "_blank");
  };

  const handleApplyAi = () => {
    try {
      const parsed = JSON.parse(aiPaste.trim());
      if (typeof parsed.title === "string" && parsed.title) {
        setValue("title", parsed.title);
      }
      if (typeof parsed.description === "string" && parsed.description) {
        setValue("description", parsed.description);
      }
      if (Array.isArray(parsed.tags) && parsed.tags.length > 0) {
        setValue("tags", (parsed.tags as string[]).slice(0, 3));
      }
      setAiPaste("");
      toast.success(t("eventDialog.ai.applied"));
    } catch {
      toast.error(t("eventDialog.ai.invalidJson"));
    }
  };

  return (
    <div className="grid gap-3 rounded-lg border border-dashed border-purple-200 dark:border-purple-900 bg-purple-50/50 dark:bg-purple-950/20 p-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-purple-500" />
        <span className="text-sm font-medium">{t("eventDialog.ai.title")}</span>
      </div>
      <p className="text-xs text-muted-foreground">
        {t("eventDialog.ai.description")}
      </p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleGeneratePrompt}
        className="w-fit gap-2 border-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950"
      >
        {aiCopied ? (
          <>
            <Check className="h-3.5 w-3.5 text-green-500" />
            {t("eventDialog.ai.copied")}
          </>
        ) : (
          <>
            <Copy className="h-3.5 w-3.5" />
            {t("eventDialog.ai.generate")}
          </>
        )}
      </Button>
      <div className="grid gap-2">
        <Label className="text-xs text-muted-foreground">
          {t("eventDialog.ai.pasteLabel")}
        </Label>
        <Textarea
          value={aiPaste}
          onChange={(e) => setAiPaste(e.target.value)}
          placeholder='{"title": "...", "description": "...", "tags": [...]}'
          rows={3}
          className="font-mono text-xs"
        />
        <Button
          type="button"
          size="sm"
          disabled={!aiPaste.trim()}
          onClick={handleApplyAi}
          className="w-fit gap-2"
        >
          <Sparkles className="h-3.5 w-3.5" />
          {t("eventDialog.ai.apply")}
        </Button>
      </div>
    </div>
  );
}
