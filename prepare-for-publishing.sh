#!/bin/bash

# 🚀 Jira Story Point Calculator - Publishing Preparation Script
# This script prepares your extension for Chrome Web Store submission

echo "🎯 Preparing Jira Story Point Calculator for publishing..."

# Set variables
EXTENSION_NAME="jira-story-point-calculator"
VERSION="1.0"
PUBLISH_DIR="${EXTENSION_NAME}-v${VERSION}-publish"
ZIP_FILE="${EXTENSION_NAME}-v${VERSION}.zip"

# Create publishing directory
echo "📁 Creating publishing directory..."
rm -rf "$PUBLISH_DIR"
mkdir -p "$PUBLISH_DIR"

# Copy required files
echo "📋 Copying required files..."
cp manifest.json "$PUBLISH_DIR/"
cp content.js "$PUBLISH_DIR/"
cp popup.html "$PUBLISH_DIR/"
cp popup.js "$PUBLISH_DIR/"
cp README.md "$PUBLISH_DIR/"
cp PUBLISHING_GUIDE.md "$PUBLISH_DIR/"

# Copy icons directory
echo "🎨 Copying icons..."
cp -r icons "$PUBLISH_DIR/"

# Remove unnecessary files from publishing directory
echo "🧹 Cleaning up publishing directory..."
cd "$PUBLISH_DIR"
rm -f .DS_Store
rm -f .gitignore

# Go back to root
cd ..

# Create ZIP file
echo "📦 Creating ZIP archive..."
if command -v zip >/dev/null 2>&1; then
    zip -r "$ZIP_FILE" "$PUBLISH_DIR" -x "*.DS_Store" "*.git*"
    echo "✅ ZIP file created: $ZIP_FILE"
else
    echo "⚠️  zip command not found. Please install zip or create archive manually."
    echo "📁 Files are ready in: $PUBLISH_DIR"
fi

# Clean up publishing directory
echo "🧹 Cleaning up..."
rm -rf "$PUBLISH_DIR"

echo ""
echo "🎉 Extension is ready for publishing!"
echo ""
echo "📋 Next steps:"
echo "1. Test the extension locally using the ZIP file"
echo "2. Create screenshots (1280x800 px)"
echo "3. Prepare store listing content"
echo "4. Upload to Chrome Web Store Developer Dashboard"
echo ""
echo "📚 See PUBLISHING_GUIDE.md for detailed instructions"
echo "📦 ZIP file: $ZIP_FILE"
echo ""
echo "🚀 Good luck with your extension launch!"

