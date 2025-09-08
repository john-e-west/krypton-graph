# DocUploadTest - Real File Testing Directory

This directory contains real files for testing the file upload functionality in Story 2.1: File Upload Interface.

## Purpose

Instead of using mock files in automated tests, these real files provide authentic testing scenarios that better represent actual user uploads. The files are used by the enhanced test suite to validate:

- File size validation with actual file sizes
- MIME type detection with real content
- Batch upload scenarios with multiple real files
- Content integrity preservation during processing
- Various file formats and sizes

## Test Files

| File | Format | Size | Description |
|------|--------|------|-------------|
| `small-test.md` | Markdown | ~200 bytes | Minimal file for basic validation |
| `sample-knowledge-base.md` | Markdown | ~2KB | Knowledge management content |
| `api-documentation.md` | Markdown | ~5KB | Technical API documentation |
| `project-requirements.md` | Markdown | ~4KB | Project requirements document |
| `large-content-sample.md` | Markdown | ~50KB | Comprehensive knowledge graph guide |
| `meeting-notes.txt` | Plain Text | ~5KB | Team meeting notes and decisions |

## Test Coverage

These files are used in the following test scenarios:

### Individual File Validation
- **Small File Test**: Validates minimal content handling
- **Medium File Test**: Tests typical document sizes
- **Large File Test**: Validates larger documents under 50MB limit
- **Format Variety**: Different content types (technical docs, requirements, notes)

### Batch Upload Testing
- **Multiple File Validation**: 3-file batch upload test
- **Maximum Capacity**: All 6 files within 10-file limit
- **Mixed Formats**: Combination of .md and .txt files

### Content Integrity
- **Size Verification**: Actual file sizes vs. limits
- **Type Detection**: Real MIME type validation
- **Content Preservation**: File integrity during validation

## Usage in Tests

```typescript
// Example usage in FileValidator.test.ts
const file = createRealFile('large-content-sample.md', 'text/markdown')
const result = validateFile(file)
expect(result.isValid).toBe(true)
```

The test helper function `createRealFile()` reads these files from disk and creates proper File objects for testing, providing more realistic test scenarios than synthetic mock files.

## Benefits

1. **Authentic Testing**: Real files with actual content and sizes
2. **Realistic Scenarios**: Various document types users might upload
3. **Content Variety**: Different structures, lengths, and formats
4. **Size Range**: From small (200 bytes) to large (50KB) files
5. **Format Coverage**: Both Markdown and plain text formats

## Maintenance

These files should be:
- Kept under 50MB (current max file size limit)
- Updated if validation requirements change
- Preserved as reference implementations
- Used consistently across all upload-related tests

---
*This directory supports comprehensive testing of the file upload functionality with real file scenarios.*