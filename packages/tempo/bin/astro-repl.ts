import { Tempo, enums } from '#tempo';
import { stringify, objectify, enumify, getType, Pledge } from '#library';
import { AstroTerm } from '/home/michael/Project/tempo-plugin/packages/astro/dist/index.js';

const mockToken = 'eyJhbGciOiJSUzI1NiJ9.eyJwZXJtaXNzaW9ucyI6eyJhc3RybyI6eyJleHAiOjE5NTQxMTA1MDMsInVwZGF0ZWRfYXQiOjE3NzkwNjc3MDN9fSwianRpIjoiNTJiMGRiNjQtNTBlYy00YmRhLWFiZWItOTUzOGRmODFiZTgwIiwiaWF0IjoxNzc5MDY3NzAzLCJpc3MiOiJNYWdtYSBDb21wdXRpbmciLCJzdWIiOiJ0ZXN0QGV4YW1wbGUuY29tIiwiZXhwIjoxOTU0MTEwNTAzfQ.NfdBM-V_LhWu0A6DEy9F4lMRMKSs6cFySwGGYQ3RizsuygWHXNf6LfskidZS5F5iwbm4INx5j8UW-Y463pohbjf_PSsGqlit5Qobd9180fwN8iadXkISito7XbaLldRCpsggvPVeXJC64e4EKSB0TNTRs1wQCKqFgmgN-_C5ubybpQlPAEQ1bmHo1sfYRTjqoPI66y7es_40EEJoH7ozzx29OlwtmyrHlkdA026T8o_Z9ny1OppSxMChBKiVqunbv_bfs0ZcG3kz8HAXxPPn4zBgDwI8kwr-BXz-idezDyCCXBfnn_dz3ejozU_ec1RghNsfnWxwtXIn6dJ21SbUKQ';

// Initialize Tempo with a mock license
Tempo.init({ license: mockToken });

// Register the Astro plugin term directly
Tempo.extend(AstroTerm);

Object.assign(globalThis, { Tempo, getType, stringify, objectify, enumify, enums, Pledge });

console.log(`\n\x1b[38;2;252;194;1m\x1b[1m ⏳ Tempo \x1b[0m\x1b[38;2;45;212;191m Astro REPL initialized.\x1b[0m\n`);

let idleTimer: NodeJS.Timeout;
const resetIdle = () => {
	clearTimeout(idleTimer);
	idleTimer = setTimeout(() => {
		console.warn('\n\x1b[33m[Tempo] REPL idle for 1 hour. Safety shutdown triggered.\x1b[0m');
		process.exit(0);
	}, 3600 * 1000);
	idleTimer.unref();
};

process.stdin.on('data', resetIdle);
resetIdle();
