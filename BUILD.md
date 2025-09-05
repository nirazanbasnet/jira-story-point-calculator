# Build System Documentation - JIRA Story Point Calculator

This document provides comprehensive documentation for the build system and optimization process.

> **Quick Reference:** See [BUILD_README.md](./BUILD_README.md) for a concise command reference.

## Overview

The build system provides multiple ways to create optimized versions of the Chrome extension, reducing the size from 38.8MB to just 72KB (99.8% reduction).

## Quick Start

### Option 1: Using the Build Script (Recommended)
```bash
./build-optimize.sh
```

### Option 2: Using npm scripts
```bash
npm run build
```

### Option 3: Using Make
```bash
make build
```

## Documentation Structure

- **[BUILD_README.md](./BUILD_README.md)** - Quick reference and command guide
- **[BUILD.md](./BUILD.md)** - Comprehensive documentation (this file)
- **[package.json](./package.json)** - npm scripts configuration
- **[Makefile](./Makefile)** - Make commands
- **[build-optimize.sh](./build-optimize.sh)** - Main build script

## Available Build Commands

### 1. Optimized Build (Production)
Creates a minified, optimized version for the Chrome Web Store.

**Command:**
```bash
./build-optimize.sh
# or
npm run build
# or
make build
```

**Output:** `build-optimized/` directory
- Minified JavaScript and HTML
- Updated manifest.json
- Only essential files
- Size: ~72KB (down from 38.8MB)

### 2. Development Build (Unminified)
Creates an unminified version for development and debugging.

**Command:**
```bash
npm run build:dev
# or
make dev
```

**Output:** `build-dev/` directory
- Original, unminified files
- Easy to debug
- All source files included

### 3. Clean Build
Removes all build directories and creates a fresh optimized build.

**Command:**
```bash
npm run build:clean
# or
make clean build
```

### 4. Check Build Size
Shows the size of your builds.

**Command:**
```bash
npm run size
# or
make size
```

## Build Process Details

The optimization script performs the following steps:

1. **File Validation** - Checks that all required files exist
2. **Directory Creation** - Creates clean build directory
3. **JavaScript Minification** - Removes comments and whitespace
4. **HTML Minification** - Compresses HTML and CSS
5. **Manifest Update** - Updates references to minified files
6. **File Copying** - Copies icons and documentation
7. **Size Calculation** - Reports optimization results

## File Structure

### Original Files
```
├── manifest.json
├── content.js
├── popup.js
├── popup.html
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

### Optimized Build
```
build-optimized/
├── manifest.json (updated)
├── content.min.js (minified)
├── popup.min.js (minified)
├── popup.min.html (minified)
├── icons/ (copied)
└── README.md (copied)
```

## Usage Examples

### For Development
```bash
# Create development build
make dev

# Load build-dev/ in Chrome as unpacked extension
# Make changes to source files
# Reload extension in Chrome
```

### For Production
```bash
# Create optimized build
make build

# Load build-optimized/ in Chrome for final testing
# Package build-optimized/ for Chrome Web Store
```

### For Testing Changes
```bash
# After making changes to source files
make clean build

# Test the optimized build
# If issues found, use make dev for debugging
```

## Troubleshooting

### Build Script Fails
- Ensure all required files exist in the root directory
- Check file permissions: `chmod +x build-optimize.sh`
- Verify you're in the correct directory

### Extension Doesn't Work
- Test with development build first: `make dev`
- Check browser console for errors
- Verify manifest.json is valid

### Size Still Large
- Ensure you're using the optimized build, not the original directory
- Check that .git and .history directories are not included
- Verify minified files are being used

## Performance Impact

| Build Type | Size | Load Time | Debugging |
|------------|------|-----------|-----------|
| Original   | 38.8MB | Slow | Easy |
| Development| ~108KB | Fast | Easy |
| Optimized  | ~72KB | Fastest | Hard |

## Next Steps After Building

1. **Test the Extension**
   - Load the build directory in Chrome
   - Test all functionality
   - Check for any errors

2. **Package for Store**
   - Use the `build-optimized/` directory
   - Create a ZIP file of the contents
   - Upload to Chrome Web Store

3. **Version Control**
   - Add `build-*/` to `.gitignore`
   - Only commit source files
   - Use build scripts for releases
