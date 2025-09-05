# JIRA Story Point Calculator - Makefile
# Simple build commands for the Chrome extension

.PHONY: build clean dev size verify help

# Default target
all: build

# Build optimized extension
build:
	@echo "🚀 Building optimized JIRA Story Point Calculator..."
	@./build-optimize.sh

# Clean and rebuild
clean:
	@echo "🧹 Cleaning previous builds..."
	@rm -rf build-optimized build-dev
	@echo "✅ Clean complete"

# Build development version (unminified)
dev:
	@echo "🔧 Building development version..."
	@mkdir -p build-dev
	@cp manifest.json content.js popup.js popup.html README.md build-dev/
	@cp -r icons build-dev/
	@echo "✅ Development build complete: build-dev/"

# Show build size
size:
	@echo "📊 Build sizes:"
	@if [ -d "build-optimized" ]; then \
		echo "   Optimized: $$(du -sh build-optimized | cut -f1)"; \
	else \
		echo "   Optimized: Not built (run 'make build')"; \
	fi
	@if [ -d "build-dev" ]; then \
		echo "   Development: $$(du -sh build-dev | cut -f1)"; \
	else \
		echo "   Development: Not built (run 'make dev')"; \
	fi

# Verify build integrity
verify:
	@echo "🔍 Verifying build integrity..."
	@./verify-build.sh

# Show help
help:
	@echo "JIRA Story Point Calculator - Build Commands"
	@echo ""
	@echo "Available commands:"
	@echo "  make build     - Build optimized extension (minified)"
	@echo "  make clean     - Remove all build directories"
	@echo "  make dev       - Build development version (unminified)"
	@echo "  make size      - Show build sizes"
	@echo "  make verify    - Verify build integrity"
	@echo "  make help      - Show this help message"
	@echo ""
	@echo "Examples:"
	@echo "  make build     # Create optimized build"
	@echo "  make clean build  # Clean and rebuild"
	@echo "  make dev       # Create development build for testing"
