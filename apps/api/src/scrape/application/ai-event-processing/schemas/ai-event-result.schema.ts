import { z } from 'zod';

export const AiEventResultSchema = z.object({
  posts: z.array(
    z.object({
      index: z.number(),
      isEvent: z.boolean(),
      events: z.array(
        z.object({
          title: z.string(),
          description: z.string(),
          tags: z.array(z.string()).max(3),
          startDateTime: z.string().nullable(),
          endDateTime: z.string().nullable(),
        }),
      ),
    }),
  ),
});

export type AiEventResult = z.infer<typeof AiEventResultSchema>;
