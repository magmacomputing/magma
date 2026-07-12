import type { Tempo } from '@magmacomputing/tempo/core';

export const nextCron = function (this: Tempo, pattern: string) {
  return this;
}

export const prevCron = function (this: Tempo, pattern: string) {
  return this;
}

declare module '@magmacomputing/tempo/core' {
  interface Tempo {
    /** Shifts to the next occurrence matching the given cron pattern. */
    nextCron(pattern: string): Tempo;
    /** Shifts to the previous occurrence matching the given cron pattern. */
    prevCron(pattern: string): Tempo;
  }
}
