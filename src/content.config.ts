import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const posts = defineCollection({
  loader: glob({ base: './src/content/posts', pattern: '*.md' }),
  schema: z.object({
    title: z.string().trim().min(1),
    description: z.string().trim().min(1),
    pubDate: z.iso.date().transform((date) => new Date(date)),
    category: z.string().trim().min(1),
    tags: z.array(z.string().trim().min(1)).default([]),
    cover: z.enum(['desk', 'observatory', 'terminal', 'notebook', 'signal']).default('desk'),
    featured: z.boolean().default(false),
    example: z.boolean().default(false),
  }),
});

export const collections = { posts };
