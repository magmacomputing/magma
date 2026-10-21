import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

/**
 * Checks CodeRabbit local review history and reports the status of the hourly sliding window.
 *
 * Usage:
 *   tempo-cli review-limit [--json]
 */
export async function reviewLimit(args = []) {
	const jsonOutput = args.includes('--json');
	const homeDir = os.homedir();
	const coderabbitDir = path.join(homeDir, '.coderabbit');
	const reviewsBase = path.join(coderabbitDir, 'reviews');

	const timestamps = [];

	if (fs.existsSync(reviewsBase)) {
		function scan(dir) {
			try {
				const entries = fs.readdirSync(dir, { withFileTypes: true });
				for (const ent of entries) {
					if (ent.isDirectory()) {
						if (ent.name === 'reviews') {
							const reviewEntries = fs.readdirSync(path.join(dir, ent.name), { withFileTypes: true });
							for (const rev of reviewEntries) {
								const ts = Number(rev.name);
								if (!Number.isNaN(ts) && ts > 0) {
									timestamps.push(ts);
								}
							}
						} else {
							scan(path.join(dir, ent.name));
						}
					}
				}
			} catch {
				// Ignore inaccessible directories
			}
		}
		scan(reviewsBase);
	}

	const now = Date.now();
	const ONE_HOUR = 60 * 60 * 1000;
	const recentTimestamps = timestamps.filter(ts => ts >= now - ONE_HOUR).sort((a, b) => b - a);

	// Load monthly stats if available
	let stats = null;
	const statsFile = path.join(coderabbitDir, 'stats.json');
	if (fs.existsSync(statsFile)) {
		try {
			stats = JSON.parse(fs.readFileSync(statsFile, 'utf8'));
		} catch {
			// Ignore parse errors
		}
	}

	const reviewsLastHour = recentTimestamps.map((ts, idx) => {
		const elapsedMins = Math.round((now - ts) / 60000);
		const resetsInMins = Math.max(0, 60 - elapsedMins);
		return {
			index: idx + 1,
			timestamp: ts,
			time: new Date(ts).toLocaleTimeString(),
			elapsedMinutes: elapsedMins,
			resetsInMinutes: resetsInMins,
		};
	});

	// Standard tier review limit is typically 3 reviews / rolling hour
	const STANDARD_TIER_LIMIT = 3;
	let cooldownMinutes = 0;
	if (recentTimestamps.length >= STANDARD_TIER_LIMIT) {
		// Oldest of the last N reviews to roll out
		const thirdOldest = recentTimestamps[STANDARD_TIER_LIMIT - 1];
		cooldownMinutes = Math.max(0, 60 - Math.round((now - thirdOldest) / 60000));
	}

	if (jsonOutput) {
		console.log(JSON.stringify({
			reviewsInLastHour: reviewsLastHour.length,
			standardTierLimit: STANDARD_TIER_LIMIT,
			isLimitReachedOnStandardTier: reviewsLastHour.length >= STANDARD_TIER_LIMIT,
			cooldownMinutes,
			recentReviews: reviewsLastHour,
			totalReviewsRecorded: stats?.totalReviews ?? timestamps.length,
		}, null, 2));
		return;
	}

	console.log(`\n======================================================`);
	console.log(`CodeRabbit Hourly Review Window Status`);
	console.log(`======================================================\n`);

	console.log(`Reviews in the last 60 minutes: ${reviewsLastHour.length}`);
	if (reviewsLastHour.length >= STANDARD_TIER_LIMIT) {
		console.log(`⚠️  Standard tier limit (${STANDARD_TIER_LIMIT} reviews / hr) may be reached.`);
		if (cooldownMinutes > 0) {
			console.log(`⏳ Estimated cooldown until next slot opens: ~${cooldownMinutes} minute(s).\n`);
		} else {
			console.log(`✅ A slot should be rolling open shortly.\n`);
		}
	} else {
		console.log(`✅ Within standard rate limit (${reviewsLastHour.length}/${STANDARD_TIER_LIMIT} used in current rolling hour).\n`);
	}

	if (reviewsLastHour.length > 0) {
		console.log(`Recent reviews in current 1-hour window:`);
		for (const r of reviewsLastHour) {
			console.log(`  • ${r.time} (${r.elapsedMinutes}m ago — rolls out in ~${r.resetsInMinutes}m)`);
		}
		console.log(``);
	}

	if (stats?.totalReviews) {
		console.log(`Lifetime reviews recorded locally: ${stats.totalReviews}`);
	}
	console.log(`\nNote: Sliding window limits are enforced server-side by CodeRabbit.`);
	console.log(`Run "coderabbit usage" to view your monthly billing period totals.\n`);
}
