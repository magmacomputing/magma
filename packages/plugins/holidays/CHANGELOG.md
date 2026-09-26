# Changelog

All notable changes to `@magmacomputing/tempo-plugin-holidays` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-09-26

### Added
- Initial bootstrap release of `@magmacomputing/tempo-plugin-holidays`.
- Zero-latency synchronous offline holiday calendars for major economies (US, AU, GB, CA, DE, FR, JP, NZ).
- Astronomical Easter Computus calculations supporting floating Christian holidays (Good Friday, Easter Monday, Ascension, Pentecost/Whit Sunday, Whit Monday).
- Weekend observation rules (Saturday → Friday / Sunday → Monday, Australian & UK substitute days, Japan Furikae Kyūjitsu, NZ Mondayisation).
- Integration with `t.geo.country` and `t.locale` country code cascades.
- Pure tree-shakeable functional API (`isPublicHoliday`, `isBusinessDay`, `getHolidayName`, `getYearHolidays`, `addBusinessDays`, `businessDaysBetween`).
- Fluent OOP instance methods (`t.isHoliday()`, `t.isBusinessDay()`, `t.nextBusinessDay()`, `t.prevBusinessDay()`, `t.addBusinessDays()`, `t.holidays`).
