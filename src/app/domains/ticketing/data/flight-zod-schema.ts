import { z } from 'zod';

export const FlightZodSchema = z.object({
  id: z.number().int(),
  from: z.string().min(3).max(20),
  to: z.string().min(3).max(20),
  date: z.string(),
  delayed: z.boolean(),
});

export const StrictFlightZodSchema = z.object({
  id: z.number().int(),
  from: z.string().min(10).max(30),
  to: z.string().min(10).max(30),
  date: z.string(),
  delayed: z.boolean(),
});
