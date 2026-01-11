# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [v1.1.0] - 2026-01-11

This release introduces conventional commits infrastructure with automated release notes generation.

### Added

- **Release notes skill** - Automated release notes generation with 14 modular library scripts for parsing commits, detecting breaking changes, categorizing changes, extracting PR metadata, contributor stats, and changelog updates
- **Conventional commits support** - Commitlint configuration with Husky pre-commit hooks enforcing commit message standards
- **Commit conventions documentation** - Comprehensive guide at `docs/contributing/commit-conventions.md`

### Changed

- **Release notes prompt** - Updated GitHub prompt template with improved structure

---

## [v1.0.1] - 2026-01-11

This release includes 1 new feature.

### Added

- **Add AI companion doc generation to feature-docs skills** (AI Tools)

