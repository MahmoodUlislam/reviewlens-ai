#!/bin/bash
# Deploy the Amazon scraper Lambda function
# Prerequisites: AWS CLI configured, appropriate IAM permissions

set -e

FUNCTION_NAME="reviewlens-scraper"
REGION="${AWS_REGION:-us-east-1}"
ROLE_ARN="${LAMBDA_ROLE_ARN}"  # Set this env var before running

echo "=== Packaging Lambda function ==="
cd "$(dirname "$0")/../lambda"

# Install production deps
npm ci --omit=dev

# Create zip
rm -f ../lambda-scraper.zip
zip -r ../lambda-scraper.zip . -x '*.git*' 'package-lock.json'

cd ..

echo "=== Deploying Lambda function ==="

# Check if function exists
if aws lambda get-function --function-name "$FUNCTION_NAME" --region "$REGION" 2>/dev/null; then
  echo "Updating existing function..."
  aws lambda update-function-code \
    --function-name "$FUNCTION_NAME" \
    --zip-file "fileb://lambda-scraper.zip" \
    --region "$REGION"
else
  echo "Creating new function..."
  aws lambda create-function \
    --function-name "$FUNCTION_NAME" \
    --runtime nodejs20.x \
    --handler index.handler \
    --role "$ROLE_ARN" \
    --zip-file "fileb://lambda-scraper.zip" \
    --timeout 30 \
    --memory-size 1024 \
    --region "$REGION"

  # Wait for function to be active
  aws lambda wait function-active-v2 --function-name "$FUNCTION_NAME" --region "$REGION"

  # Create function URL for public access
  aws lambda create-function-url-config \
    --function-name "$FUNCTION_NAME" \
    --auth-type NONE \
    --cors '{"AllowOrigins":["*"],"AllowMethods":["POST","OPTIONS"],"AllowHeaders":["Content-Type"]}' \
    --region "$REGION"

  # Add resource-based policy for public access
  aws lambda add-permission \
    --function-name "$FUNCTION_NAME" \
    --action lambda:InvokeFunctionUrl \
    --principal "*" \
    --function-url-auth-type NONE \
    --statement-id FunctionURLPublicAccess \
    --region "$REGION"
fi

# Get function URL
FUNCTION_URL=$(aws lambda get-function-url-config --function-name "$FUNCTION_NAME" --region "$REGION" --query 'FunctionUrl' --output text 2>/dev/null)

echo ""
echo "=== Deployment Complete ==="
echo "Function URL: $FUNCTION_URL"
echo ""
echo "Add this to your .env.local:"
echo "SCRAPER_LAMBDA_URL=$FUNCTION_URL"

# Cleanup
rm -f lambda-scraper.zip
