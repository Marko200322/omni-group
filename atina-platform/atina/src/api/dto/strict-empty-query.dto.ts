import { z } from 'zod';

/** GET rute bez dokumentovanih query parametara — nepoznati ključevi → 400. */
export const StrictEmptyQueryDto = z.object({}).strict();
