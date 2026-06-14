const { Temporal } = require('@js-temporal/polyfill');
const zdt = Temporal.Now.zonedDateTimeISO();
console.log(zdt.toLocaleString('fr-FR', { month: 'long' }));
