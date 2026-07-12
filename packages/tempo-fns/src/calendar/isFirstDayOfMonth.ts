import type { Tempo } from '@magmacomputing/tempo';

// Minimal duck-typing interface for Temporal objects
interface TemporalLike {
	day: number;
}

export const isFirstDayOfMonth = (input: TemporalLike | Tempo): boolean => {
	// Tempo exposes `.day` directly, making it natively compatible 
	// with Temporal's duck-typing!
	return input.day === 1;
};
