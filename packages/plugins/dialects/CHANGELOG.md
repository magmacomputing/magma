# Changelog

All notable changes to `@magmacomputing/tempo-plugin-dialects` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-09-20

### Added
- Initial GA release of `@magmacomputing/tempo-plugin-dialects`.
- Support for **Unicode LDML / UTS #35** format masks (`yyyy-MM-dd HH:mm:ss.SSS`, `dd LLL yyyy`, etc.).
- Support for **POSIX `strftime`** format specifiers (`%Y-%m-%d %H:%M:%S`, `%B %d, %Y`, etc.).
- Support for **Moment.js / Day.js** format patterns (`YYYY-MM-DD`).
- Added `t.dialects` namespace providing `t.dialects.ldml()`, `t.dialects.strftime()`, and `t.dialects.format()`.
- Added `Tempo.dialects` static tools (`Tempo.dialects.parse()`, `Tempo.dialects.fromFormats()`).
- Added drop-in migration shims `t.toFormat()` and `Tempo.fromFormat()`.
- Zero-boilerplate auto-installation via `@magmacomputing/tempo-plugin-dialects/install`.
