/**
 * Tempo Locale Configuration Cookbook
 * 
 * This file provides sample localized dictionaries and format patterns for Tempo.
 * You can mix these configurations into your `tempo.config.ts` to add multi-language support.
 * 
 * Localized Modifiers Map:
 *  - '>' maps to "next", "future"
 *  - '<' maps to "last", "previous", "past"
 *  - '=' maps to "this", "current"
 */



// ==========================================
// French (fr)
// ==========================================
export const fr_FR = {
	locale: 'fr-FR',
	// Localized TimeZone resolution
	timeZones: {
		'cet': 'Europe/Paris',
		'cest': 'Europe/Paris'
	},
	// Localized custom formats & modifiers
	registry: {
		formats: {
			'frenchDate': '{dd} {mmm} {yyyy}',
			'frenchTime': '{hh}h{mi}',
		},
		modifiers: {
			'>': ['prochain', 'prochaine', 'dans', 'suivant', 'suivante'],
			'<': ['dernier', 'dernière', 'il y a', 'passé', 'passée'],
			'=': ['ce', 'cette']
		}
	}
}

// ==========================================
// Spanish (es)
// ==========================================
export const es_ES = {
	locale: 'es-ES',
	// Localized TimeZone resolution
	timeZones: {
		'cet': 'Europe/Madrid',
		'cest': 'Europe/Madrid',
		'wet': 'Atlantic/Canary'
	},
	// Localized custom formats & modifiers
	registry: {
		formats: {
			'spanishDate': '{dd} {mmm} {yyyy}',
			'spanishTime': '{hh}:{mi}',
		},
		modifiers: {
			'>': ['próximo', 'próxima', 'en', 'siguiente'],
			'<': ['pasado', 'pasada', 'hace', 'último', 'última'],
			'=': ['este', 'esta']
		}
	}
}

// ==========================================
// Usage Example
// ==========================================
/*
import { defineConfig } from '@magmacomputing/tempo';
import { deepMerge } from '@magmacomputing/tempo/library';
import { fr_FR, es_ES } from './locales.sample.js';

// To merge multiple locales:
// const combinedLocales = deepMerge(fr_FR, es_ES);

export default defineConfig({
	// ... your other config
	...fr_FR
});
*/
