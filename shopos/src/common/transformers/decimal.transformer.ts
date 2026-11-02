import { ValueTransformer } from 'typeorm';

// Postgres returns DECIMAL columns as strings to avoid precision loss.
// Convert them back to numbers so arithmetic (e.g. order totals) works.
export const decimalTransformer: ValueTransformer = {
  to: (value?: number | null) => value,
  from: (value?: string | null) =>
    value === null || value === undefined ? value : parseFloat(value),
};
