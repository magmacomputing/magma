# Changelog

All notable changes to the `@magmacomputing/tempo-plugin-roman` project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-10-22

### Added
- **Initial Bootstrap Release (Phase 1: Mathematical Foundations)**:
  - Classical Roman calendar date calculator resolving lunar anchors:
    - **Kalends** (*Kalendae*): 1st of every month.
    - **Nones** (*Nonae*): 7th in MOM-J months (March, October, May, July); 5th in all others.
    - **Ides** (*Idus*): 15th in MOM-J months; 13th in all others.
    - **Pridie**: Day immediately preceding an anchor.
    - **Ante Diem**: Inclusive backward counting from an anchor with proper Latin grammar declensions (Ablative for anchor days, Accusative for ante diem/pridie).
  - Leap year and classical bissextile day (*ante diem bis sextum Kalendas Martias*) intercalation on February 24 with round-trip stability.
  - Ab Urbe Condita (AUC) year conversion engine mapping bidirectional Gregorian/Julian astronomical and historical BCE/CE years.
  - Attached static `Tempo.roman` namespace with `.toClassical()`, `.fromClassical()`, `.yearToAuc()`, `.aucToYear()`, `.getNonesDay()`, `.getIdesDay()`, and `.isLeapYear()`.
  - Added `Tempo.prototype.toRomanClassical()` and `Tempo.prototype.toAUC()` instance methods, along with `Tempo.prototype.auc` getter.
  - Provided side-effect zero-boilerplate import via `@magmacomputing/tempo-plugin-roman/install`.
