
# Quantra AI - Local Model Import Script
# Run this once you have downloaded 'quantra-ai.Q4_K_M.gguf' to the project folder.

$GGUF_FILE = "tenali-llm/mistral-7b-instruct-v0.3.Q4_K_M.gguf"
$MODEL_FILE = "tenali-llm/deployment/Modelfile"

if (Test-Path $GGUF_FILE) {
    Write-Host "🚀 Found GGUF file. Importing into Ollama..." -ForegroundColor Cyan
    ollama create quantra-ai -f $MODEL_FILE
    Write-Host "✅ Quantra AI is now ready!" -ForegroundColor Green
    Write-Host "You can now run 'python tenali-llm/production/api_server.py' to start the live bot." -ForegroundColor Green
} else {
    Write-Host "❌ Could not find '$GGUF_FILE'." -ForegroundColor Red
    Write-Host "Please make sure you downloaded the file from Colab and placed it in the 'tenali-llm' folder." -ForegroundColor Yellow
}
