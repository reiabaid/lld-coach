Set-Location "D:\CipherSchools\lld-coach"

$envContent = Get-Content .env
$groqKey = (($envContent | Where-Object { $_ -match '^GROQ_API_KEY=' }) -replace '^GROQ_API_KEY=', '').Trim()
$groqModel = (($envContent | Where-Object { $_ -match '^GROQ_MODEL=' }) -replace '^GROQ_MODEL=', '').Trim()

if (-not $groqKey) {
  Write-Host "GROQ_API_KEY is empty in .env - set it before deploying." -ForegroundColor Red
  exit 1
}

npx vercel deploy --temporary --yes --prod `
  -e GROQ_API_KEY=$groqKey -e GROQ_MODEL=$groqModel -e USE_FAKE_EVALUATOR=false `
  -b GROQ_API_KEY=$groqKey -b GROQ_MODEL=$groqModel -b USE_FAKE_EVALUATOR=false `
  .
