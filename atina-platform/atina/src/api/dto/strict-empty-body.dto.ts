import { z } from 'zod';

/** Mutacije koje ne koriste JSON polja — odbija nepoznata polja u telu (i prazan `{}`). */
export const StrictEmptyBodyDto = z.preprocess(
  (val) => (val === undefined || val === null ? {} : val),
  z.object({}).strict()
);
