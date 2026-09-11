param([Parameter(Mandatory = $true)][string]$InputDirectory)

$word = $null
try {
  $word = New-Object -ComObject Word.Application
  $word.Visible = $false
  Get-ChildItem -LiteralPath $InputDirectory -Filter '*.docx' | ForEach-Object {
    $pdf = [System.IO.Path]::ChangeExtension($_.FullName, '.pdf')
    $document = $word.Documents.Open($_.FullName, $false, $true)
    try { $document.ExportAsFixedFormat($pdf, 17) } finally { $document.Close(0) }
    if (-not (Test-Path -LiteralPath $pdf)) { throw "Word did not produce $pdf" }
    Write-Output $pdf
  }
} finally {
  if ($word) { $word.Quit() | Out-Null; [void][Runtime.InteropServices.Marshal]::ReleaseComObject($word) }
}
