# Talent Matching Feature Documentation Index

> Navigation hub for Talent Matching Feature documentation

## Quick Navigation

### Main Documentation
- **[Full Feature Documentation](./README.TalentMatchingFeature.md)** - Comprehensive 1,600+ line feature documentation with all 15 mandatory sections

### Quick References
- **[Quick Reference Guide](./QUICK-REFERENCE.md)** - Fast lookup for API endpoints, models, and common tasks

## Documentation Overview

### What's Available

| Document | Size | Purpose | Audience |
|----------|------|---------|----------|
| [README.TalentMatchingFeature.md](./README.TalentMatchingFeature.md) | 1,622 lines | Complete feature documentation | Developers, QA, Architects |
| [QUICK-REFERENCE.md](./QUICK-REFERENCE.md) | 400 lines | Quick API lookup guide | Developers, Integrators |
| [INDEX.md](./INDEX.md) | This file | Navigation hub | Everyone |

## Document Sections

The main documentation includes 15 comprehensive sections:

1. **Overview** - Feature summary and key capabilities
2. **Business Requirements** - 9 functional requirements (FR-TM-01 to FR-TM-09)
3. **Design Reference** - Matching algorithm, score components, sanitization
4. **Architecture** - System diagram and layer responsibilities
5. **Domain Model** - Entities, enums, relationships, models
6. **Core Workflows** - 3 detailed end-to-end workflows
7. **API Reference** - 2 endpoints fully documented
8. **Frontend Components** - Planned UI components structure
9. **Backend Controllers** - JobMatchingController implementation details
10. **Cross-Service Integration** - CandidateHub service integration
11. **Permission System** - Authorization matrix and rules
12. **Test Specifications** - 16 comprehensive test cases
13. **Troubleshooting** - 8 common issues with solutions
14. **Related Documentation** - Cross-references to related features
15. **Version History** - Release notes and statistics

## Key Features Documented

- AI-powered candidate-to-job matching
- Multi-dimensional scoring (skills, profile, relevance)
- Batch candidate retrieval with pagination
- Detailed score analysis for pairs
- Organizational unit scoping
- Full purchase candidate filtering
- HTML content sanitization
- External CandidateHub integration

## Test Cases Summary

**Total**: 16 test cases (TC-TM-001 to TC-TM-016)

- Priority 1: Core Functionality (8 tests)
- Priority 2: Integration & External Service (4 tests)
- Priority 3: Authorization & Edge Cases (4 tests)

All test cases include code evidence with file:line references.

## API Quick Reference

### Endpoints

1. `GET /api/job-matching/get-matched-candidates-from-candidate-hub`
   - Get candidates matched to a job
   - Parameters: jobId, pageIndex, pageSize

2. `GET /api/job-matching/get-candidates-score`
   - Get score details for candidate-job pairs
   - Parameters: candidateIds[], jobIds[]

## Compliance Status

✅ **GOLD STANDARD COMPLIANT**

- All 15 mandatory sections
- 16 test cases with code evidence
- 30+ verified file:line references
- Complete domain model
- 1,622+ lines of documentation

## How to Get Started

1. **First time?** Start with [README.TalentMatchingFeature.md Overview](./README.TalentMatchingFeature.md#overview)
2. **Need API details?** Go to [QUICK-REFERENCE.md](./QUICK-REFERENCE.md)
3. **Implementing features?** Read [Core Workflows](./README.TalentMatchingFeature.md#core-workflows)
4. **Testing?** See [Test Specifications](./README.TalentMatchingFeature.md#test-specifications)
5. **Troubleshooting?** Check [Troubleshooting Guide](./README.TalentMatchingFeature.md#troubleshooting)

## Document Statistics

| Metric | Value |
|--------|-------|
| Main Documentation | 1,622 lines |
| Quick Reference | 400 lines |
| Test Cases | 16 |
| Code References | 30+ |
| Sections | 15 |
| Workflows | 3 |
| Entities | 8 |
| Endpoints | 2 |

---

**Last Updated**: 2026-01-10
**Status**: ✅ Complete and Compliant
