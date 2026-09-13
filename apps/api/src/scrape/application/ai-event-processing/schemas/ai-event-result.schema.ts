import { z } from 'zod';

export const AiEventResultSchema = z.object({
  events: z.array(
    z.object({
      index: z.number(),
      isEvent: z.boolean(),
      title: z.string().nullable(),
      description: z.string().nullable(),
      tags: z.array(z.string()).max(3),
    }),
  ),
});

export type AiEventResult = z.infer<typeof AiEventResultSchema>;
