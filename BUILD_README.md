# 🔧 Build System - JIRA Story Point Calculator

This document provides a quick reference for building and optimizing the Chrome extension.

## ⚡ Quick Start

```bash
# Build optimized extension (recommended)
./build-optimize.sh

# Or using npm
npm run build

# Or using Make
make build
```

## 📋 Available Commands

| Command | Description | Output |
|---------|-------------|---------|
| `./build-optimize.sh` | **Main build script** | `build-optimized/` |
| `npm run build` | Build using npm | `build-optimized/` |
| `make build` | Build using Make | `build-optimized/` |
| `make dev` | Development build | `build-dev/` |
| `make clean` | Remove builds | - |
| `make size` | Show sizes | - |
| `make help` | Show help | - |

## 🎯 Build Types

### Production Build (Optimized)
- **Size:** ~72KB
- **Files:** Minified JS/HTML
- **Use for:** Chrome Web Store, distribution
- **Command:** `./build-optimize.sh`

### Development Build
- **Size:** ~88KB  
- **Files:** Unminified, readable
- **Use for:** Debugging, development
- **Command:** `make dev`

## 📊 Size Comparison

| Version | Size | Reduction |
|---------|------|-----------|
| Original | 38.8 MB | - |
| Development | 88 KB | 99.8% |
| Optimized | 72 KB | 99.8% |

## 🚀 Typical Workflow

```bash
# 1. Make changes to source files
# 2. Build optimized version
./build-optimize.sh

# 3. Test in Chrome
# Load build-optimized/ as unpacked extension

# 4. If issues, debug with development build
make dev
# Load build-dev/ for debugging

# 5. Package for store
# ZIP contents of build-optimized/
```

## 📁 Build Output Structure

```
build-optimized/
├── manifest.json          # Updated for minified files
├── content.min.js         # Minified content script
├── popup.min.js          # Minified popup script  
├── popup.min.html        # Minified popup HTML
├── icons/                # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md             # Documentation
```

## 🔍 Troubleshooting

### Build Fails
```bash
# Check file permissions
chmod +x build-optimize.sh

# Verify required files exist
ls -la manifest.json content.js popup.js popup.html icons/
```

### Extension Doesn't Work
```bash
# Test with development build first
make dev
# Load build-dev/ in Chrome

# Check browser console for errors
# Verify manifest.json is valid
```

### Large File Size
- Ensure you're using `build-optimized/`, not source directory
- Check that `.git` and `.history` are excluded
- Verify minified files are being used

## ⚙️ Build Process Details

The build script automatically:

1. ✅ Validates required files exist
2. 🗂️ Creates clean build directory  
3. 📦 Minifies JavaScript (removes comments/whitespace)
4. 🎨 Minifies HTML/CSS (compresses markup)
5. 📝 Updates manifest.json references
6. 📋 Copies icons and documentation
7. 📊 Reports optimization results

## 🎛️ Advanced Usage

### Clean Rebuild
```bash
make clean build
# or
npm run build:clean
```

### Check Build Sizes
```bash
make size
# Shows sizes of all builds
```

### Development Testing
```bash
make dev
# Creates unminified build for debugging
```

## 📦 Packaging for Chrome Web Store

1. **Build optimized version:**
   ```bash
   ./build-optimize.sh
   ```

2. **Create ZIP file:**
   ```bash
   cd build-optimized
   zip -r ../jira-calculator.zip .
   ```

3. **Upload to Chrome Web Store:**
   - Use the ZIP file
   - All files in `build-optimized/` should be in the ZIP root

## 🔄 Version Control

Build directories are automatically excluded from git:
- `build/`
- `build-optimized/`  
- `build-dev/`

Only source files should be committed to version control.

## 📞 Support

If you encounter issues:

1. **Check this README** for common solutions
2. **Run `make help`** for command reference
3. **Use development build** for debugging
4. **Check file permissions** and required files

---

**Happy Building! 🚀**
