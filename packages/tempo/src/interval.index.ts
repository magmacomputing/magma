import { Interval, type TemporalPoint as LibraryTemporalPoint } from '#library/scheduling/interval.class.js';
import type { Tempo } from './tempo.class.js';

export type TemporalPoint = Tempo | LibraryTemporalPoint;
export { Interval };
