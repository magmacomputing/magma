# Changelog

All notable changes to the `@tempo-kit/plugin-cultural` project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-11-28

### Added
- Initial standalone release of `@tempo-kit/plugin-cultural` (extracted from `@tempo-kit/builtin-terms` with `tempo-kit@^5.0.0` peer dependency).
- **`ZodiacTerm` (`#zdc`, `#zodiac`, `#sunSign`, `#starSign`)**: Western Tropical Zodiac signs with emojis, traits, symbols, shorthand navigation, ordinals, and format tokens.
- **`EasternTerm` (`#sign`, `#shengxiao`, `#lunarSign`, `#eastern`)**: East Asian Sexagenary Lunar Zodiac cycle with elements, Yin/Yang polarity, and regional variants (`cn`, `jp`, `kr`, `vn`).
- **Tree-Shakeable Entrypoints**: Pure root entrypoint (`.`), granular term subpaths (`./zodiac`, `./eastern`), and side-effecting auto-registration entrypoint (`./install`).
