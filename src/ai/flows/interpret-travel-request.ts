'use server';
/**
 * @fileOverview Interprets a user's travel request and extracts key parameters.
 *
 * - interpretTravelRequest - A function that interprets the travel request.
 * - InterpretTravelRequestInput - The input type for the interpretTravelRequest function.
 * - InterpretTravelRequestOutput - The return type for the interpretTravelRequest function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const InterpretTravelRequestInputSchema = z.object({
  request: z.string().describe('The user travel request.'),
});
export type InterpretTravelRequestInput = z.infer<typeof InterpretTravelRequestInputSchema>;

const InterpretTravelRequestOutputSchema = z.object({
  destination: z.string().describe('The destination of the trip.'),
  startDate: z.string().describe('The start date of the trip (YYYY-MM-DD).'),
  endDate: z.string().describe('The end date of the trip (YYYY-MM-DD).'),
});
export type InterpretTravelRequestOutput = z.infer<typeof InterpretTravelRequestOutputSchema>;

export async function interpretTravelRequest(input: InterpretTravelRequestInput): Promise<InterpretTravelRequestOutput> {
  return interpretTravelRequestFlow(input);
}

const prompt = ai.definePrompt({
  name: 'interpretTravelRequestPrompt',
  input: {
    schema: z.object({
      request: z.string().describe('The user travel request.'),
    }),
  },
  output: {
    schema: z.object({
      destination: z.string().describe('The destination of the trip.'),
      startDate: z.string().describe('The start date of the trip (YYYY-MM-DD).'),
      endDate: z.string().describe('The end date of the trip (YYYY-MM-DD).'),
    }),
  },
  prompt: `You are a travel assistant AI. Extract the destination, start date, and end date from the user's request.\n\nRequest: {{{request}}}\n\nIf the user does not specify the date, make a reasonable guess for when they would like to travel. Respond with today's date if all else fails.\nOutput in JSON format.`,
});

const interpretTravelRequestFlow = ai.defineFlow<
  typeof InterpretTravelRequestInputSchema,
  typeof InterpretTravelRequestOutputSchema
>({
  name: 'interpretTravelRequestFlow',
  inputSchema: InterpretTravelRequestInputSchema,
  outputSchema: InterpretTravelRequestOutputSchema,
},
async input => {
  const {output} = await prompt(input);
  return output!;
});
