// src/ai/flows/suggest-diy-projects.ts
'use server';
/**
 * @fileOverview This file defines a Genkit flow for suggesting DIY project ideas based on identified recyclable items.
 *
 * The flow takes a list of recyclable items as input and returns a list of suggested DIY project ideas.
 * It uses a prompt to generate the project ideas based on the input items.
 *
 * @param {SuggestDIYProjectsInput} input - The input for the flow, containing a list of recyclable items.
 * @returns {Promise<SuggestDIYProjectsOutput>} - A promise that resolves to a list of suggested DIY project ideas.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

import {getYouTubeVideos} from '@/services/youtube';

const SuggestDIYProjectsInputSchema = z.object({
  recyclableItems: z
    .array(z.string())
    .describe('A list of identified recyclable items.'),
});
export type SuggestDIYProjectsInput = z.infer<
  typeof SuggestDIYProjectsInputSchema
>;

const SuggestDIYProjectsOutputSchema = z.object({
  projects: z.array(
    z.object({
      title: z.string().describe('The title of the DIY project.'),
      description: z.string().describe('A brief description of the project.'),
      requiredItems: z
        .array(z.string())
        .describe('A list of items required for the project.'),
      steps: z.array(z.string()).describe('The steps to complete the project.'),
    })
  ),
});
export type SuggestDIYProjectsOutput = z.infer<
  typeof SuggestDIYProjectsOutputSchema
>;

export async function suggestDIYProjects(input: SuggestDIYProjectsInput): Promise<SuggestDIYProjectsOutput> {
  return suggestDIYProjectsFlow(input);
}

const suggestDIYProjectsPrompt = ai.definePrompt({
  name: 'suggestDIYProjectsPrompt',
  input: {
    schema: z.object({
      recyclableItems: z
        .array(z.string())
        .describe('A list of identified recyclable items.'),
    }),
  },
  output: {
    schema: z.object({
      projects: z.array(
        z.object({
          title: z.string().describe('The title of the DIY project.'),
          description: z.string().describe('A brief description of the project.'),
          requiredItems: z
            .array(z.string())
            .describe('A list of items required for the project.'),
          steps: z.array(z.string()).describe('The steps to complete the project.'),
        })
      ),
    }),
  },
  prompt: `You are a DIY project idea generator. Given a list of recyclable items, you will suggest creative DIY project ideas that utilize the majority of the identified items.

  Recyclable Items:
  {{#each recyclableItems}}
  - {{{this}}}
  {{/each}}

  Prioritize projects that can use the most of the given recyclable items. Suggest projects with clear titles, descriptions, required items, and step-by-step instructions.
  Return the output in JSON format.
  `,
});

const suggestDIYProjectsFlow = ai.defineFlow<
  typeof SuggestDIYProjectsInputSchema,
  typeof SuggestDIYProjectsOutputSchema
>(
  {
    name: 'suggestDIYProjectsFlow',
    inputSchema: SuggestDIYProjectsInputSchema,
    outputSchema: SuggestDIYProjectsOutputSchema,
  },
  async input => {
    const {output} = await suggestDIYProjectsPrompt(input);

    if (!output) {
      throw new Error('No output from suggestDIYProjectsPrompt');
    }

    // Optionally enrich with YouTube videos. Not using tool calling because
    // we always want to get YouTube videos regardless of user input.
    const projectsWithVideos = await Promise.all(
      output.projects.map(async project => {
        const videos = await getYouTubeVideos(project.title);
        return {
          ...project,
          videos,
        };
      })
    );

    return output;
  }
);
