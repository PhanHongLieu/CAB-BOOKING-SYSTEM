$ErrorActionPreference = 'Stop'
$ts = Get-Date -Format 'yyMMddHHmmss'
$email = "driver_$ts@test.com"
$phone = "09$ts"
if ($phone.Length -gt 11) { $phone = $phone.Substring(0,11) }
$license = "DL-$ts"
$plate = "51A$($ts.Substring($ts.Length-5))"

$results = New-Object System.Collections.ArrayList

function Add-Result($step, $ok, $status, $detail) {
  [void]$results.Add([PSCustomObject]@{ step=$step; ok=$ok; status=$status; detail=$detail })
}

try {
  $regBody = @{ name='Driver Test'; email=$email; password='123456'; phone=$phone; role='driver' } | ConvertTo-Json
  $reg = Invoke-RestMethod -Method Post -Uri 'http://localhost:3001/api/auth/register' -ContentType 'application/json' -Body $regBody
  Add-Result 'auth_register' $reg.success 201 "email=$email"

  $loginBody = @{ email=$email; password='123456' } | ConvertTo-Json
  $login = Invoke-RestMethod -Method Post -Uri 'http://localhost:3001/api/auth/login' -ContentType 'application/json' -Body $loginBody
  $token = $login.data.accessToken
  Add-Result 'auth_login' ($login.success -and [string]::IsNullOrEmpty($token) -eq $false) 200 "token_len=$($token.Length)"

  $headers = @{ Authorization = "Bearer $token" }

  $driverRegBody = @{ 
    licenseNumber=$license
    vehicle=@{ make='Toyota'; model='Vios'; year=2021; color='White'; licensePlate=$plate; vehicleType='economy' }
    documents=@{ driverLicense='https://example.com/dl.jpg' }
  } | ConvertTo-Json -Depth 6

  $dreg = Invoke-RestMethod -Method Post -Uri 'http://localhost:3003/api/drivers/register' -Headers $headers -ContentType 'application/json' -Body $driverRegBody
  $driverId = $dreg.data._id
  Add-Result 'driver_register' $dreg.success 201 "driverId=$driverId"

  $profile = Invoke-RestMethod -Method Get -Uri 'http://localhost:3003/api/drivers/profile' -Headers $headers
  Add-Result 'driver_profile' ($profile.success -and $profile.data.licenseNumber -eq $license) 200 "status=$($profile.data.status)"

  $onlineBody = @{ isOnline=$true; isAvailable=$true } | ConvertTo-Json
  $online = Invoke-RestMethod -Method Patch -Uri 'http://localhost:3003/api/drivers/status' -Headers $headers -ContentType 'application/json' -Body $onlineBody
  Add-Result 'driver_status_online' ($online.success -and $online.data.status -eq 'online' -and $online.data.isAvailable -eq $true) 200 "status=$($online.data.status), available=$($online.data.isAvailable)"

  $offlineBody = @{ isOnline=$false } | ConvertTo-Json
  $offline = Invoke-RestMethod -Method Patch -Uri 'http://localhost:3003/api/drivers/status' -Headers $headers -ContentType 'application/json' -Body $offlineBody
  Add-Result 'driver_status_offline' ($offline.success -and $offline.data.status -eq 'offline' -and $offline.data.isAvailable -eq $false) 200 "status=$($offline.data.status), available=$($offline.data.isAvailable)"

  $kycBody = @{ kycStatus='approved' } | ConvertTo-Json
  $kyc = Invoke-RestMethod -Method Patch -Uri "http://localhost:3003/api/drivers/kyc/$driverId" -Headers $headers -ContentType 'application/json' -Body $kycBody
  Add-Result 'driver_kyc_approved' ($kyc.success -and $kyc.data.status -eq 'approved') 200 "kyc=$($kyc.data.status)"

} catch {
  $msg = $_.Exception.Message
  if ($_.Exception.Response) {
    try {
      $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
      $reader.BaseStream.Position = 0
      $reader.DiscardBufferedData()
      $body = $reader.ReadToEnd()
      $msg = "$msg | body=$body"
    } catch {}
  }
  Add-Result 'unexpected_error' $false 500 $msg
}

$results | ConvertTo-Json -Depth 5
