'use server';
/**
 * @fileOverview Analyzes browser content to extract travel-related information.
 *
 * - analyzeBrowserContent - A function that handles the analysis of browser content.
 * - AnalyzeBrowserContentInput - The input type for the analyzeBrowserContent function.
 * - AnalyzeBrowserContentOutput - The return type for the analyzeBrowserContent function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const AnalyzeBrowserContentInputSchema = z.object({
  text: z.string().describe('The text content from the browser to analyze.'),
});
export type AnalyzeBrowserContentInput = z.infer<typeof AnalyzeBrowserContentInputSchema>;

const AnalyzeBrowserContentOutputSchema = z.object({
  destination: z.string().optional().describe('The destination extracted from the text.'),
  startDate: z.string().optional().describe('The start date extracted from the text (YYYY-MM-DD).'),
  endDate: z.string().optional().describe('The end date extracted from the text (YYYY-MM-DD).'),
  preferences: z.string().optional().describe('Any preferences mentioned in the text.'),
});
export type AnalyzeBrowserContentOutput = z.infer<typeof AnalyzeBrowserContentOutputSchema>;

export async function analyzeBrowserContent(input: AnalyzeBrowserContentInput): Promise<AnalyzeBrowserContentOutput> {
  return analyzeBrowserContentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeBrowserContentPrompt',
  input: {
    schema: z.object({
      text: z.string().describe('The text content from the browser to analyze.'),
    }),
  },
  output: {
    schema: z.object({
      destination: z.string().optional().describe('The destination extracted from the text.'),
      startDate: z.string().optional().describe('The start date extracted from the text (YYYY-MM-DD).'),
      endDate: z.string().optional().describe('The end date extracted from the text (YYYY-MM-DD).'),
      preferences: z.string().optional().describe('Any preferences mentioned in the text.'),
    }),
  },
  prompt: `You are a travel assistant that extracts travel information from text content.\n\n  Analyze the following text and extract the destination, start date, end date, and any preferences mentioned. If any of the information is not found, leave blank.\n\n  Text: {{{text}}}\n\n  Output the extracted information in JSON format. Dates should be in YYYY-MM-DD format.\n`,
});

const analyzeBrowserContentFlow = ai.defineFlow<
  typeof AnalyzeBrowserContentInputSchema,
  typeof AnalyzeBrowserContentOutputSchema
>(
  {
    name: 'analyzeBrowserContentFlow',
    inputSchema: AnalyzeBrowserContentInputSchema,
    outputSchema: AnalyzeBrowserContentOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
