#!/bin/bash

# JavaScript Syntax Checker for JIRA Story Point Calculator
# This script checks if the minified JavaScript files have valid syntax

set -e

echo "🔍 Checking JavaScript syntax in build-optimized..."

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

# Check if build directory exists
if [ ! -d "build-optimized" ]; then
    print_error "build-optimized directory not found!"
    echo "Run './build-optimize.sh' first to create the build."
    exit 1
fi

# Check if Node.js is available for syntax checking
if ! command -v node &> /dev/null; then
    print_error "Node.js not found. Cannot perform syntax checking."
    echo "Please install Node.js or check the files manually."
    exit 1
fi

# Function to check JavaScript syntax
check_js_syntax() {
    local file="$1"
    local filename=$(basename "$file")
    
    print_status "Checking syntax: $filename"
    
    # Create a temporary file with the JavaScript content
    temp_file=$(mktemp).js
    echo "console.log('Syntax check');" > "$temp_file"
    cat "$file" >> "$temp_file"
    
    # Check syntax using Node.js
    if node --check "$temp_file" 2>/dev/null; then
        print_success "$filename syntax is valid"
        rm "$temp_file"
        return 0
    else
        print_error "$filename has syntax errors"
        echo "Errors:"
        node --check "$temp_file" 2>&1 || true
        rm "$temp_file"
        return 1
    fi
}

# Check all JavaScript files
js_files=("build-optimized/content.min.js" "build-optimized/popup.min.js")
errors=0

for file in "${js_files[@]}"; do
    if [ -f "$file" ]; then
        if ! check_js_syntax "$file"; then
            errors=$((errors + 1))
        fi
    else
        print_error "File not found: $file"
        errors=$((errors + 1))
    fi
done

# Summary
echo ""
if [ $errors -eq 0 ]; then
    echo "=========================================="
    echo "✅ ALL JAVASCRIPT FILES HAVE VALID SYNTAX!"
    echo "=========================================="
    print_success "No syntax errors found"
else
    echo "=========================================="
    echo "❌ JAVASCRIPT SYNTAX ERRORS FOUND!"
    echo "=========================================="
    print_error "$errors file(s) have syntax errors"
    echo ""
    echo "🔧 To fix:"
    echo "   1. Check the minification process"
    echo "   2. Rebuild with: ./build-optimize.sh"
    echo "   3. Run this check again"
    exit 1
fi
