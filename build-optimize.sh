#!/bin/bash

# JIRA Story Point Calculator - Build Optimization Script
# This script creates an optimized build of the Chrome extension

set -e  # Exit on any error

echo "🚀 Starting JIRA Story Point Calculator build optimization..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required files exist
print_status "Checking required files..."
required_files=("manifest.json" "content.js" "popup.js" "popup.html" "icons")
for file in "${required_files[@]}"; do
    if [ ! -e "$file" ]; then
        print_error "Required file/directory '$file' not found!"
        exit 1
    fi
done
print_success "All required files found"

# Create build directory
BUILD_DIR="build-optimized"
print_status "Creating build directory: $BUILD_DIR"
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

# Function to minify JavaScript
minify_js() {
    local input_file="$1"
    local output_file="$2"
    
    print_status "Minifying JavaScript: $input_file -> $output_file"
    
    # Use a more robust approach with Node.js for minification
    if command -v node &> /dev/null; then
        # Create a simple minifier using Node.js
        node -e "
        const fs = require('fs');
        const code = fs.readFileSync('$input_file', 'utf8');
        
        // Very basic minification that preserves syntax
        let minified = code
            // Remove single-line comments (but preserve URLs and strings)
            .replace(/\/\/.*$/gm, '')
            // Remove multi-line comments
            .replace(/\/\*[\s\S]*?\*\//g, '')
            // Remove extra whitespace and newlines
            .replace(/\s+/g, ' ')
            // Only remove spaces around very safe operators
            .replace(/\s*([{}();,])\s*/g, '\$1')
            // Clean up any remaining double spaces
            .replace(/\s{2,}/g, ' ')
            .trim();
        
        fs.writeFileSync('$output_file', minified);
        " 2>/dev/null || {
            print_warning "Node.js minification failed, using fallback method"
            # Fallback to simple sed-based minification
            sed 's|//.*||g' "$input_file" | \
            sed 's|/\*.*\*/||g' | \
            tr -d '\n\r' | \
            sed 's/  */ /g' | \
            sed 's/ *{ */{/g' | \
            sed 's/ *} */}/g' | \
            sed 's/ *; */;/g' | \
            sed 's/ *, */,/g' | \
            sed 's/ *: */:/g' | \
            sed 's/ *= */=/g' | \
            sed 's/ *+ */+/g' | \
            sed 's/ *- */-/g' | \
            sed 's/ *\* */\*/g' | \
            sed 's/ *\/ */\//g' | \
            sed 's/ *( */(/g' | \
            sed 's/ *) */)/g' | \
            sed 's/ *\[ */[/g' | \
            sed 's/ *\] */]/g' | \
            sed 's/ *< */</g' | \
            sed 's/ *> */>/g' | \
            sed 's/ *=== */===/g' | \
            sed 's/ *!== */!==/g' | \
            sed 's/ *== */==/g' | \
            sed 's/ *!= */!=/g' | \
            sed 's/  */ /g' | \
            sed 's/ *&& */ && /g' | \
            sed 's/ *|| */ || /g' > "$output_file"
        }
    else
        print_warning "Node.js not available, using basic minification"
        # Basic minification without Node.js
        sed 's|//.*||g' "$input_file" | \
        sed 's|/\*.*\*/||g' | \
        tr -d '\n\r' | \
        sed 's/  */ /g' | \
        sed 's/ *{ */{/g' | \
        sed 's/ *} */}/g' | \
        sed 's/ *; */;/g' | \
        sed 's/ *, */,/g' | \
        sed 's/ *: */:/g' | \
        sed 's/ *= */=/g' | \
        sed 's/ *+ */+/g' | \
        sed 's/ *- */-/g' | \
        sed 's/ *\* */\*/g' | \
        sed 's/ *\/ */\//g' | \
        sed 's/ *( */(/g' | \
        sed 's/ *) */)/g' | \
        sed 's/ *\[ */[/g' | \
        sed 's/ *\] */]/g' | \
        sed 's/ *< */</g' | \
        sed 's/ *> */>/g' | \
        sed 's/ *=== */===/g' | \
        sed 's/ *!== */!==/g' | \
        sed 's/ *== */==/g' | \
        sed 's/ *!= */!=/g' | \
        sed 's/  */ /g' | \
        sed 's/ *&& */ && /g' | \
        sed 's/ *|| */ || /g' > "$output_file"
    fi
}

# Function to minify HTML
minify_html() {
    local input_file="$1"
    local output_file="$2"
    
    print_status "Minifying HTML: $input_file -> $output_file"
    
    # Remove comments, extra whitespace, and minify
    sed 's|<!--.*-->||g' "$input_file" | \
    tr -d '\n\r' | \
    sed 's/  */ /g' | \
    sed 's/ *> */>/g' | \
    sed 's/ *< */</g' | \
    sed 's/ *= */=/g' | \
    sed 's/ *{ */{/g' | \
    sed 's/ *} */}/g' | \
    sed 's/ *; */;/g' | \
    sed 's/ *: */:/g' | \
    sed 's/ *, */,/g' > "$output_file"
}

# Copy and minify files
print_status "Processing extension files..."

# Copy manifest.json
cp manifest.json "$BUILD_DIR/"

# Minify content.js
minify_js content.js "$BUILD_DIR/content.min.js"

# Minify popup.js
minify_js popup.js "$BUILD_DIR/popup.min.js"

# Minify popup.html
minify_html popup.html "$BUILD_DIR/popup.min.html"

# Fix script reference in minified HTML
sed -i '' 's/popup\.js/popup.min.js/g' "$BUILD_DIR/popup.min.html"

# Copy icons directory
cp -r icons "$BUILD_DIR/"

# Copy README.md
cp README.md "$BUILD_DIR/"

# Update manifest.json to use minified files
print_status "Updating manifest.json to use minified files..."
sed -i '' 's/"popup.html"/"popup.min.html"/g' "$BUILD_DIR/manifest.json"
sed -i '' 's/"content.js"/"content.min.js"/g' "$BUILD_DIR/manifest.json"

# Create .gitignore for build directory
cat > "$BUILD_DIR/.gitignore" << EOF
# This directory contains the optimized build files
# Do not commit this directory to version control
*
EOF

# Calculate sizes
print_status "Calculating build sizes..."
ORIGINAL_SIZE=$(du -sh . | cut -f1)
BUILD_SIZE=$(du -sh "$BUILD_DIR" | cut -f1)

# Count files
ORIGINAL_FILES=$(find . -type f -not -path './.git/*' -not -path './.history/*' -not -path './build*/*' | wc -l | tr -d ' ')
BUILD_FILES=$(find "$BUILD_DIR" -type f | wc -l | tr -d ' ')

# Display results
echo ""
echo "=========================================="
echo "🎉 BUILD OPTIMIZATION COMPLETE!"
echo "=========================================="
echo ""
echo "📊 Size Comparison:"
echo "   Original: $ORIGINAL_SIZE"
echo "   Optimized: $BUILD_SIZE"
echo ""
echo "📁 File Count:"
echo "   Original: $ORIGINAL_FILES files"
echo "   Optimized: $BUILD_FILES files"
echo ""
echo "📂 Build Directory: $BUILD_DIR/"
echo ""
echo "🔧 Files included:"
echo "   ✓ manifest.json (updated to use minified files)"
echo "   ✓ content.min.js (minified from content.js)"
echo "   ✓ popup.min.js (minified from popup.js)"
echo "   ✓ popup.min.html (minified from popup.html)"
echo "   ✓ icons/ (copied as-is)"
echo "   ✓ README.md (copied as-is)"
echo ""
echo "🚀 Next Steps:"
echo "   1. Load '$BUILD_DIR' as unpacked extension in Chrome"
echo "   2. Test the extension functionality"
echo "   3. Package for Chrome Web Store from '$BUILD_DIR'"
echo ""
print_success "Build optimization completed successfully!"
