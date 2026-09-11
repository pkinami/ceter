param(
  [Parameter(Mandatory = $true)][string]$Master,
  [Parameter(Mandatory = $true)][string]$Prepared,
  [Parameter(Mandatory = $true)][string]$Pdf
)

$ErrorActionPreference = 'Stop'
Copy-Item -LiteralPath $Master -Destination $Prepared -Force
$word = $null
try {
  $word = New-Object -ComObject Word.Application
  $word.Visible = $false
  $document = $word.Documents.Open($Prepared, $false, $false)
  # All variable values live in the master tables. White rather than delete
  # their text so Word retains every original cell/paragraph measurement.
  foreach ($table in $document.Tables) { $table.Range.Font.Color = 16777215 }
  $document.Save()
  $document.ExportAsFixedFormat($Pdf, 17)
} finally {
  if ($document) { $document.Close(0) }
  if ($word) { $word.Quit(); [void][Runtime.InteropServices.Marshal]::ReleaseComObject($word) }
}
