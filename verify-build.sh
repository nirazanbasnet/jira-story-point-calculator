#!/bin/bash

# Build Verification Script for JIRA Story Point Calculator
# This script verifies that the build-optimized directory is correct

set -e

echo "🔍 Verifying build-optimized directory..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if build directory exists
if [ ! -d "build-optimized" ]; then
    print_error "build-optimized directory not found!"
    echo "Run './build-optimize.sh' first to create the build."
    exit 1
fi

print_status "Checking required files..."

# Required files
required_files=(
    "manifest.json"
    "content.min.js"
    "popup.min.js"
    "popup.min.html"
    "icons/icon16.png"
    "icons/icon48.png"
    "icons/icon128.png"
    "README.md"
)

missing_files=()
for file in "${required_files[@]}"; do
    if [ ! -e "build-optimized/$file" ]; then
        missing_files+=("$file")
    fi
done

if [ ${#missing_files[@]} -gt 0 ]; then
    print_error "Missing required files:"
    for file in "${missing_files[@]}"; do
        echo "  - $file"
    done
    exit 1
fi

print_success "All required files present"

# Check manifest.json references
print_status "Checking manifest.json references..."

if grep -q "popup.min.html" build-optimized/manifest.json; then
    print_success "manifest.json correctly references popup.min.html"
else
    print_error "manifest.json should reference popup.min.html"
    exit 1
fi

if grep -q "content.min.js" build-optimized/manifest.json; then
    print_success "manifest.json correctly references content.min.js"
else
    print_error "manifest.json should reference content.min.js"
    exit 1
fi

# Check popup.min.html script reference
print_status "Checking popup.min.html script reference..."

if grep -q "popup.min.js" build-optimized/popup.min.html; then
    print_success "popup.min.html correctly references popup.min.js"
else
    print_error "popup.min.html should reference popup.min.js"
    exit 1
fi

# Check for old references
if grep -q "popup.js" build-optimized/popup.min.html; then
    print_error "popup.min.html still contains reference to popup.js"
    exit 1
fi

if grep -q "content.js" build-optimized/manifest.json; then
    print_error "manifest.json still contains reference to content.js"
    exit 1
fi

# Check file sizes
print_status "Checking file sizes..."

total_size=$(du -sh build-optimized | cut -f1)
if [[ "$total_size" =~ ^[0-9]+K$ ]] || [[ "$total_size" =~ ^[0-9]+\.[0-9]+K$ ]]; then
    print_success "Build size is reasonable: $total_size"
else
    print_warning "Build size seems large: $total_size (expected ~72K)"
fi

# Check for development files
print_status "Checking for development files..."

dev_files=(".git" ".history" "node_modules" "build" "build-dev")
found_dev_files=()

for file in "${dev_files[@]}"; do
    if [ -e "build-optimized/$file" ]; then
        found_dev_files+=("$file")
    fi
done

if [ ${#found_dev_files[@]} -gt 0 ]; then
    print_error "Development files found in build:"
    for file in "${found_dev_files[@]}"; do
        echo "  - $file"
    done
    echo "These should not be included in the build."
    exit 1
fi

print_success "No development files found"

# Summary
echo ""
echo "=========================================="
echo "✅ BUILD VERIFICATION COMPLETE!"
echo "=========================================="
echo ""
echo "📊 Build Summary:"
echo "   Directory: build-optimized/"
echo "   Size: $total_size"
echo "   Files: $(find build-optimized -type f | wc -l | tr -d ' ')"
echo ""
echo "🎯 Build Status: READY FOR DEPLOYMENT"
echo ""
echo "🚀 Next Steps:"
echo "   1. Load 'build-optimized' as unpacked extension in Chrome"
echo "   2. Test all functionality"
echo "   3. Package for Chrome Web Store"
echo ""
print_success "Build verification passed!"
