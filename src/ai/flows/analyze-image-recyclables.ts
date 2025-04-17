'use server';

/**
 * @fileOverview Analyzes an image to identify recyclable items and their quantities.
 *
 * - analyzeImageForRecyclables - A function that analyzes the image for recyclable items.
 * - AnalyzeImageForRecyclablesInput - The input type for the analyzeImageForRecyclables function.
 * - AnalyzeImageForRecyclablesOutput - The return type for the analyzeImageForRecyclables function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const AnalyzeImageForRecyclablesInputSchema = z.object({
  photoBase64: z.string().describe('The base64 encoded string of the image to analyze.'),
});
export type AnalyzeImageForRecyclablesInput = z.infer<
  typeof AnalyzeImageForRecyclablesInputSchema
>;

const AnalyzeImageForRecyclablesOutputSchema = z.object({
  items: z
    .array(
      z.object({
        name: z.string().describe('The name of the recyclable item.'),
        quantity: z.number().describe('The quantity of the recyclable item.'),
      })
    )
    .describe('The list of recyclable items identified in the image.'),
});
export type AnalyzeImageForRecyclablesOutput = z.infer<
  typeof AnalyzeImageForRecyclablesOutputSchema
>;

export async function analyzeImageForRecyclables(
  input: AnalyzeImageForRecyclablesInput
): Promise<AnalyzeImageForRecyclablesOutput> {
  return analyzeImageForRecyclablesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeImageForRecyclablesPrompt',
  input: {
    schema: z.object({
      photoBase64: z.string().describe('The base64 encoded string of the image to analyze.'),
    }),
  },
  output: {
    schema: z.object({
      items: z
        .array(
          z.object({
            name: z.string().describe('The name of the recyclable item.'),
            quantity: z.number().describe('The quantity of the recyclable item.'),
          })
        )
        .describe('The list of recyclable items identified in the image.'),
    }),
  },
  prompt: `You are an AI expert in recyclable materials.

You will analyze the image and identify the different recyclable items in the image, along with their quantities.

Image: {{media url=photoBase64 contentType="image/jpeg"}}

Return the list of items and their quantities.
`,
});

const analyzeImageForRecyclablesFlow = ai.defineFlow<
  typeof AnalyzeImageForRecyclablesInputSchema,
  typeof AnalyzeImageForRecyclablesOutputSchema
>(
  {
    name: 'analyzeImageForRecyclablesFlow',
    inputSchema: AnalyzeImageForRecyclablesInputSchema,
    outputSchema: AnalyzeImageForRecyclablesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
