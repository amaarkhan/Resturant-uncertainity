$ErrorActionPreference = 'Stop'

$base = 'http://localhost:4000/api/v1'
$today = (Get-Date).ToString('yyyy-MM-dd')
$baselineFrom = (Get-Date).AddDays(-21).ToString('yyyy-MM-dd')
$baselineTo = (Get-Date).AddDays(-15).ToString('yyyy-MM-dd')
$pilotFrom = (Get-Date).AddDays(-14).ToString('yyyy-MM-dd')
$pilotTo = $today

$results = New-Object System.Collections.Generic.List[object]

function Add-Result {
  param(
    [string]$Check,
    [bool]$Ok,
    [string]$Detail
  )

  $status = if ($Ok) { 'PASS' } else { 'FAIL' }
  $results.Add([PSCustomObject]@{
    Check = $Check
    Status = $status
    Detail = $Detail
  }) | Out-Null
}

try {
  $health = Invoke-RestMethod -Method Get -Uri 'http://localhost:4000/health'
  Add-Result -Check 'Health endpoint' -Ok ($health.status -eq 'ok') -Detail "status=$($health.status)"

  $ownerBody = @{ email='karachi@example.com'; password='owner123' } | ConvertTo-Json
  $owner = Invoke-RestMethod -Method Post -Uri "$base/auth/login" -ContentType 'application/json' -Body $ownerBody
  Add-Result -Check 'Owner login' -Ok (-not [string]::IsNullOrEmpty($owner.accessToken)) -Detail "restaurantId=$($owner.restaurantId)"

  $ownerHeaders = @{ Authorization = "Bearer $($owner.accessToken)" }
  $recBody = @{
    restaurantId = $owner.restaurantId
    date = $today
    manualContext = @{
      sourceStatus = 'live'
      weatherType = 'pleasant'
      eventType = 'none'
      eventIntensity = 0
    }
  } | ConvertTo-Json -Depth 8

  $rec = Invoke-RestMethod -Method Post -Uri "$base/recommendations/generate" -Headers $ownerHeaders -ContentType 'application/json' -Body $recBody
  $itemCount = ($rec.items | Measure-Object).Count
  Add-Result -Check 'Generate recommendation' -Ok ($itemCount -gt 0) -Detail "items=$itemCount; confidence=$($rec.confidenceLevel)"

  $entries = @()
  foreach ($it in $rec.items) {
    $prepared = [int]$it.recommendedQty
    $sold = [Math]::Max(0, [int]($prepared * 0.9))
    $leftover = [Math]::Max(0, $prepared - $sold)
    $entries += @{
      menuItemId = $it.menuItemId
      preparedQty = $prepared
      soldQty = $sold
      leftoverQty = $leftover
      stockout = $false
      recommendationFollowed = $true
    }
  }

  $outcomeBody = @{
    restaurantId = $owner.restaurantId
    date = $today
    entries = $entries
  } | ConvertTo-Json -Depth 8

  $outcome = Invoke-RestMethod -Method Post -Uri "$base/outcomes/daily" -Headers $ownerHeaders -ContentType 'application/json' -Body $outcomeBody
  Add-Result -Check 'Submit outcomes' -Ok ($outcome.savedCount -ge 1) -Detail "savedCount=$($outcome.savedCount)"

  $feedbackBody = @{
    restaurantId = $owner.restaurantId
    date = $today
    feedbackType = 'balanced'
    confidenceRating = 4
    note = 'Phase3 smoke test'
  } | ConvertTo-Json

  $fb = Invoke-RestMethod -Method Post -Uri "$base/feedback/quick" -Headers $ownerHeaders -ContentType 'application/json' -Body $feedbackBody
  Add-Result -Check 'Submit quick feedback' -Ok (-not [string]::IsNullOrEmpty($fb.feedbackId)) -Detail "feedbackId=$($fb.feedbackId)"

  $history = Invoke-RestMethod -Method Get -Uri "$base/recommendations/history?restaurantId=$($owner.restaurantId)&fromDate=$pilotFrom&toDate=$pilotTo" -Headers $ownerHeaders
  Add-Result -Check 'Recommendation history' -Ok ($history.count -ge 1) -Detail "count=$($history.count)"

  $trends = Invoke-RestMethod -Method Get -Uri "$base/recommendations/trends?restaurantId=$($owner.restaurantId)" -Headers $ownerHeaders
  $trendCount = ($trends.trends | Measure-Object).Count
  Add-Result -Check 'Recommendation trends' -Ok ($trendCount -ge 1) -Detail "days=$trendCount"

  $adminBody = @{ email='admin@example.com'; password='admin123' } | ConvertTo-Json
  $admin = Invoke-RestMethod -Method Post -Uri "$base/auth/login" -ContentType 'application/json' -Body $adminBody
  Add-Result -Check 'Admin login' -Ok (-not [string]::IsNullOrEmpty($admin.accessToken)) -Detail 'token-issued'

  $adminHeaders = @{ Authorization = "Bearer $($admin.accessToken)" }

  $restaurants = Invoke-RestMethod -Method Get -Uri "$base/admin/restaurants" -Headers $adminHeaders
  Add-Result -Check 'Admin restaurants list' -Ok ((($restaurants.restaurants | Measure-Object).Count) -ge 1) -Detail "count=$((($restaurants.restaurants | Measure-Object).Count))"

  $menuItems = Invoke-RestMethod -Method Get -Uri "$base/admin/menu-items" -Headers $adminHeaders
  Add-Result -Check 'Admin menu list' -Ok ((($menuItems.menuItems | Measure-Object).Count) -ge 1) -Detail "count=$((($menuItems.menuItems | Measure-Object).Count))"

  $users = Invoke-RestMethod -Method Get -Uri "$base/admin/users" -Headers $adminHeaders
  Add-Result -Check 'Admin users list' -Ok ((($users.users | Measure-Object).Count) -ge 1) -Detail "count=$((($users.users | Measure-Object).Count))"

  $overview = Invoke-RestMethod -Method Get -Uri "$base/admin/metrics/overview" -Headers $adminHeaders
  Add-Result -Check 'Admin metrics overview' -Ok ($overview.activeRestaurants -ge 1) -Detail "activeRestaurants=$($overview.activeRestaurants); wastePercent=$($overview.wastePercent)"

  $instr = Invoke-RestMethod -Method Get -Uri "$base/admin/metrics/instrumentation" -Headers $adminHeaders
  Add-Result -Check 'Admin instrumentation metrics' -Ok ($instr.reliability.successRate -ge 0) -Detail "successRate=$($instr.reliability.successRate); avgLatency=$($instr.reliability.avgLatency)"

  $pmfUrl = "$base/admin/metrics/pmf-report?baselineFrom=$baselineFrom&baselineTo=$baselineTo&pilotFrom=$pilotFrom&pilotTo=$pilotTo&week4Usage=45&willingnessToPay=25"
  $pmf = Invoke-RestMethod -Method Get -Uri $pmfUrl -Headers $adminHeaders
  Add-Result -Check 'Admin PMF report' -Ok (-not [string]::IsNullOrEmpty($pmf.decision.decision)) -Detail "decision=$($pmf.decision.decision)"

  $dash = Invoke-RestMethod -Method Get -Uri "$base/admin/dashboard" -Headers $adminHeaders
  Add-Result -Check 'Admin dashboard' -Ok ($dash.activeRestaurants -ge 1) -Detail "usageRate=$($dash.usageRate); errorCount=$($dash.errorCount)"
}
catch {
  Add-Result -Check 'Smoke script runtime' -Ok $false -Detail $_.Exception.Message
}

$results | Format-Table -AutoSize

$failed = @($results | Where-Object { $_.Status -eq 'FAIL' })
if ($failed.Count -gt 0) {
  Write-Error "Smoke checks failed"
  exit 1
}

Write-Output 'All smoke checks passed.'
