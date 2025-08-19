#!/bin/bash

echo "=== Running Test Suite ==="

# Clean up old coverage files to ensure fresh coverage reports
echo "🧹 Cleaning up old coverage files..."
rm -f coverage.out coverage.html
rm -rf coverage/ .nyc_output/

# Run Go tests with coverage and capture results
echo "🧪 Go Backend Tests with Coverage:"
GO_RESULT=$(go test -v -coverprofile=coverage.out ./... 2>&1)
GO_PASSED=$(echo "$GO_RESULT" | grep -c -- '--- PASS:')
GO_FAILED=$(echo "$GO_RESULT" | grep -c -- '--- FAIL:')
echo "$GO_RESULT" | head -10

# Generate Go HTML coverage report if coverage.out exists
if [ -f "coverage.out" ]; then
    echo "📊 Generating Go coverage HTML report..."
    go tool cover -html=coverage.out -o coverage.html
    echo "   Go coverage report saved to: coverage.html"
fi

echo ""
echo "🧪 JavaScript Frontend Tests with Coverage:"

# Run all JavaScript tests with coverage and capture results
JS_RESULT=$(npm run coverage 2>&1)
JS_PASSED=$(echo "$JS_RESULT" | grep -o '[0-9]\+ passing' | head -1 | grep -o '[0-9]\+')
JS_FAILED=$(echo "$JS_RESULT" | grep -o '[0-9]\+ failing' | head -1 | grep -o '[0-9]\+')

# If no explicit counts found, parse from output
if [ -z "$JS_PASSED" ]; then
    JS_PASSED=0
fi
if [ -z "$JS_FAILED" ]; then
    JS_FAILED=0
fi

echo "$JS_RESULT"

echo ""
echo "=== Final Test Results ==="
echo "📊 Backend (Go):"
echo "   ✅ Passed: $GO_PASSED tests"
echo "   ❌ Failed: $GO_FAILED tests"
echo ""
echo "📊 Frontend (JavaScript):"
echo "   ✅ Passed: $JS_PASSED tests"
echo "   ❌ Failed: $JS_FAILED tests"
echo ""

# Generate failing tests mini-report
echo "=== Generating Failing Tests Report ==="
cat > FAILING_TESTS_REPORT.md << 'EOF'
# Test Failures Report

## Backend (Go Tests)
EOF

if [ "$GO_FAILED" -eq 0 ]; then
    echo "✅ **All backend tests are passing** - $GO_PASSED tests passed, $GO_FAILED failed" >> FAILING_TESTS_REPORT.md
else
    echo "❌ **$GO_FAILED backend tests failing** out of $((GO_PASSED + GO_FAILED)) total tests" >> FAILING_TESTS_REPORT.md
    echo "" >> FAILING_TESTS_REPORT.md
    echo "### Backend Failing Tests:" >> FAILING_TESTS_REPORT.md
    echo "$GO_RESULT" | grep -A1 "--- FAIL:" | grep -v "^--$" >> FAILING_TESTS_REPORT.md
fi

cat >> FAILING_TESTS_REPORT.md << 'EOF'

## Frontend (JavaScript Tests)
EOF

if [ "$JS_FAILED" -eq 0 ]; then
    echo "✅ **All frontend tests are passing** - $JS_PASSED tests passed, $JS_FAILED failed" >> FAILING_TESTS_REPORT.md
else
    echo "❌ **$JS_FAILED tests failing** out of $((JS_PASSED + JS_FAILED)) total tests" >> FAILING_TESTS_REPORT.md
    echo "" >> FAILING_TESTS_REPORT.md
    echo "### Frontend Failing Test Names:" >> FAILING_TESTS_REPORT.md
    echo "$JS_RESULT" | grep -E "^\s*[0-9]+\)\s" | sed 's/^[[:space:]]*[0-9]*)[[:space:]]*/- /' >> FAILING_TESTS_REPORT.md
fi

echo "" >> FAILING_TESTS_REPORT.md
echo "---" >> FAILING_TESTS_REPORT.md
echo "**Summary:** $JS_PASSED passing ✅ | $JS_FAILED failing ❌ | $GO_FAILED backend failures" >> FAILING_TESTS_REPORT.md

echo "📄 Failing tests report saved to: FAILING_TESTS_REPORT.md"
echo ""
echo "ℹ️  Coverage Reports Available:"
echo "   📊 Go Backend Coverage: coverage.html"
echo "   📊 JavaScript Frontend Coverage: coverage/index.html"
echo ""
echo "=== Coverage Information ==="
if [ -f "coverage.out" ]; then
    echo "📊 Go Coverage Summary:"
    go tool cover -func=coverage.out | tail -1
fi
echo ""
echo "🔄 Coverage files are now regenerated fresh on each test run"
echo "   - Removed files will no longer appear in coverage"
echo "   - Added files will be automatically included"