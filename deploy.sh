#!/bin/bash

# Simple deployment script for TwoTop Manager

echo "🚀 TwoTop Manager Deployment Script"
echo "===================================="
echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "⚠️  Warning: .env.local not found!"
    echo "Please create .env.local with your GEMINI_API_KEY"
    echo ""
fi

# Build the project
echo "📦 Building the project..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo "✅ Build completed successfully!"
echo ""
echo "📂 Build output is in the 'dist' directory"
echo ""

# Ask user which platform to deploy to
echo "Which platform would you like to deploy to?"
echo "1) Cloudflare Pages"
echo "2) Vercel"
echo "3) Netlify"
echo "4) Manual (just build)"
echo ""
read -p "Enter your choice (1-4): " choice

case $choice in
    1)
        echo "🌐 Deploying to Cloudflare Pages..."
        if command -v wrangler &> /dev/null; then
            wrangler pages deploy dist
        else
            echo "❌ Wrangler CLI not found!"
            echo "Install it with: npm install -g wrangler"
            echo "Or deploy manually at: https://pages.cloudflare.com/"
        fi
        ;;
    2)
        echo "▲ Deploying to Vercel..."
        if command -v vercel &> /dev/null; then
            vercel --prod
        else
            echo "❌ Vercel CLI not found!"
            echo "Install it with: npm install -g vercel"
            echo "Or deploy manually at: https://vercel.com/"
        fi
        ;;
    3)
        echo "🌊 Deploying to Netlify..."
        if command -v netlify &> /dev/null; then
            netlify deploy --prod --dir=dist
        else
            echo "❌ Netlify CLI not found!"
            echo "Install it with: npm install -g netlify-cli"
            echo "Or deploy manually at: https://netlify.com/"
        fi
        ;;
    4)
        echo "✅ Build complete! You can now manually upload the 'dist' folder to your hosting service."
        ;;
    *)
        echo "❌ Invalid choice!"
        exit 1
        ;;
esac

echo ""
echo "🎉 Deployment process complete!"
echo ""
echo "📝 Remember to set environment variables on your hosting platform:"
echo "   - GEMINI_API_KEY=your_api_key"
echo ""
