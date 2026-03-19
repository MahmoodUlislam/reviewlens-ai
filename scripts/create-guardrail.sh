#!/bin/bash
# Create the Bedrock Guardrail for ReviewLens AI scope guard
# Prerequisites: AWS CLI configured with bedrock permissions

set -e

REGION="${AWS_REGION:-us-east-1}"
GUARDRAIL_NAME="reviewlens-scope-guard"

echo "=== Creating Bedrock Guardrail: $GUARDRAIL_NAME ==="

GUARDRAIL_RESPONSE=$(aws bedrock create-guardrail \
  --region "$REGION" \
  --name "$GUARDRAIL_NAME" \
  --description "Scope guard for ReviewLens AI - blocks off-topic queries not related to ingested product reviews" \
  --blocked-input-messaging "I can only analyze the product reviews that have been loaded into this session. That question falls outside the scope of the ingested review data. Feel free to ask me anything about the reviews!" \
  --blocked-outputs-messaging "I can only provide analysis based on the ingested product reviews. I'm unable to help with that topic. Please ask me something about the reviews!" \
  --topic-policy-config '{
    "topicsConfig": [
      {
        "name": "Weather",
        "definition": "Questions about weather, temperature, climate, forecasts, or meteorological conditions",
        "type": "DENY",
        "examples": [
          "What is the weather today?",
          "Will it rain tomorrow?",
          "What is the temperature in Toronto?"
        ]
      },
      {
        "name": "News_Politics_Sports",
        "definition": "Questions about current events, news, politics, elections, government, sports scores, games, or athletic events",
        "type": "DENY",
        "examples": [
          "Who won the election?",
          "What is the latest news?",
          "What was the score of the game?"
        ]
      },
      {
        "name": "Other_Review_Platforms",
        "definition": "Questions about reviews from platforms other than the one currently being analyzed, such as Google Maps reviews, Yelp reviews, G2 reviews, Trustpilot reviews, or any other review platform not currently loaded",
        "type": "DENY",
        "examples": [
          "What do Google reviews say about this?",
          "How are Yelp reviews for this product?",
          "What does G2 say about this?",
          "Compare Amazon reviews with Google reviews"
        ]
      },
      {
        "name": "General_Knowledge",
        "definition": "General knowledge questions, trivia, coding help, math problems, history, science, or any topic not directly about analyzing the specific product reviews loaded in this session",
        "type": "DENY",
        "examples": [
          "What is the capital of France?",
          "Help me write a Python script",
          "What is the meaning of life?",
          "Explain quantum physics",
          "How do I cook pasta?"
        ]
      },
      {
        "name": "Competitor_Comparisons",
        "definition": "Questions asking to compare the product with competitor products using knowledge outside the loaded reviews. Only comparisons explicitly mentioned within the reviews themselves are allowed",
        "type": "DENY",
        "examples": [
          "How does this compare to the Samsung version?",
          "Is the Apple alternative better?",
          "Which competitor product should I buy instead?"
        ]
      }
    ]
  }' \
  --content-policy-config '{
    "filtersConfig": [
      {"type": "HATE", "inputStrength": "HIGH", "outputStrength": "HIGH"},
      {"type": "INSULTS", "inputStrength": "HIGH", "outputStrength": "HIGH"},
      {"type": "SEXUAL", "inputStrength": "HIGH", "outputStrength": "HIGH"},
      {"type": "VIOLENCE", "inputStrength": "HIGH", "outputStrength": "HIGH"},
      {"type": "MISCONDUCT", "inputStrength": "HIGH", "outputStrength": "HIGH"},
      {"type": "PROMPT_ATTACK", "inputStrength": "HIGH", "outputStrength": "NONE"}
    ]
  }')

GUARDRAIL_ID=$(echo "$GUARDRAIL_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['guardrailId'])")
GUARDRAIL_VERSION=$(echo "$GUARDRAIL_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['version'])")

echo ""
echo "=== Guardrail Created ==="
echo "Guardrail ID: $GUARDRAIL_ID"
echo "Version: $GUARDRAIL_VERSION"
echo ""
echo "Add these to your .env.local:"
echo "BEDROCK_GUARDRAIL_ID=$GUARDRAIL_ID"
echo "BEDROCK_GUARDRAIL_VERSION=$GUARDRAIL_VERSION"
