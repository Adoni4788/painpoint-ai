$disk = Get-WmiObject Win32_LogicalDisk -Filter "DeviceID='C:'"
$free = [math]::Round($disk.FreeSpace / 1GB, 2)
$total = [math]::Round($disk.Size / 1GB, 2)
$used = [math]::Round(($disk.Size - $disk.FreeSpace) / 1GB, 2)
Write-Host "Total: $total GB"
Write-Host "Used:  $used GB"
Write-Host "Free:  $free GB"
