#!/bin/bash

echo "🚀 PokerHome Production Deployment Script"
echo "========================================="

# Check if required tools are installed
if ! command -v git &> /dev/null; then
    echo "❌ Git is required but not installed"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ Node.js/npm is required but not installed"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Run tests
echo "🧪 Running tests..."
npm run test:ci
if [ $? -ne 0 ]; then
    echo "❌ Tests failed. Please fix issues before deploying."
    exit 1
fi

# Build the project
echo "🏗️ Building project..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please fix build errors."
    exit 1
fi

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "📥 Installing Vercel CLI..."
    npm install -g vercel
fi

echo "✅ Pre-deployment checks passed!"
echo ""
echo "🚀 Ready to deploy! Next steps:"
echo "1. Make sure you've set up all services (Supabase, Upstash, Resend)"
echo "2. Add environment variables in Vercel dashboard"
echo "3. Run: vercel --prod"
echo ""
echo "📖 See DEPLOYMENT.md for detailed instructions"