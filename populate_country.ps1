$ErrorActionPreference = 'Stop'
$p = "c:\Users\phoenix\OneDrive\Documents\School 2026\FIT2179 - Data vis\A2\data\Love song categories for Billboard Top 10 hits, 1958 - September 2023, from The Pudding.csv"
$rows = Import-Csv -Path $p

function Get-PrimaryArtist([string]$artistList) {
    if ([string]::IsNullOrWhiteSpace($artistList)) { return "" }
    return (($artistList -split '\|')[0]).Trim()
}

function Normalize-Country([string]$country) {
    if ([string]::IsNullOrWhiteSpace($country)) { return "" }
    $c = $country.Trim()
    switch -Regex ($c) {
        '^USA$|^U\.S\.A\.?$|^United States of America$' { return 'United States' }
        '^UK$|^U\.K\.?$|^England$|^Scotland$|^Wales$|^Northern Ireland$|^Great Britain$' { return 'United Kingdom' }
        default { return $c }
    }
}

function Lookup-TheAudioDB([string]$name) {
    try {
        $encoded = [System.Uri]::EscapeDataString($name)
        $url = "https://theaudiodb.com/api/v1/json/2/search.php?s=$encoded"
        $resp = Invoke-RestMethod -Uri $url -Method Get -TimeoutSec 15
        if ($null -ne $resp.artists -and $resp.artists.Count -gt 0) {
            $exact = $resp.artists | Where-Object { $_.strArtist -eq $name } | Select-Object -First 1
            if (-not $exact) { $exact = $resp.artists | Select-Object -First 1 }
            $country = Normalize-Country $exact.strCountry
            if (-not [string]::IsNullOrWhiteSpace($country)) { return $country }
        }
    } catch {}
    return ""
}

function Lookup-MusicBrainz([string]$name) {
    try {
        $encoded = [System.Uri]::EscapeDataString('artist:"' + $name + '"')
        $url = "https://musicbrainz.org/ws/2/artist/?query=$encoded&fmt=json&limit=5"
        $headers = @{ 'User-Agent' = 'FIT2179-Country-Enricher/1.0 (educational project)' }
        $resp = Invoke-RestMethod -Uri $url -Headers $headers -Method Get -TimeoutSec 20
        if ($null -ne $resp.artists -and $resp.artists.Count -gt 0) {
            $candidates = $resp.artists | Sort-Object -Property @{Expression={[int]$_.score};Descending=$true}
            foreach ($cand in $candidates) {
                $score = 0
                try { $score = [int]$cand.score } catch {}
                if ($score -lt 70) { continue }
                $country = ""
                if ($cand.area -and $cand.area.name) { $country = $cand.area.name }
                elseif ($cand.'begin-area' -and $cand.'begin-area'.name) { $country = $cand.'begin-area'.name }
                $country = Normalize-Country $country
                if (-not [string]::IsNullOrWhiteSpace($country)) { return $country }
            }
        }
    } catch {}
    return ""
}

$primaryArtists = $rows | ForEach-Object { Get-PrimaryArtist $_.pipe_delimited_artist_list }
$uniqueArtists = $primaryArtists | Where-Object { $_ -ne '' } | Sort-Object -Unique

$cache = @{}
$i = 0
foreach ($artist in $uniqueArtists) {
    $i++
    $country = Lookup-TheAudioDB $artist
    if ([string]::IsNullOrWhiteSpace($country)) {
        $country = Lookup-MusicBrainz $artist
    }
    $cache[$artist] = $country
    if (($i % 200) -eq 0) { Write-Output "Processed artists: $i / $($uniqueArtists.Count)" }
}

foreach ($row in $rows) {
    $artist = Get-PrimaryArtist $row.pipe_delimited_artist_list
    if ($cache.ContainsKey($artist)) {
        $row.country = $cache[$artist]
    } else {
        $row.country = ""
    }
}

$rows | Export-Csv -Path $p -NoTypeInformation -Encoding UTF8

$filled = ($rows | Where-Object { -not [string]::IsNullOrWhiteSpace($_.country) }).Count
$artistFilled = ($cache.GetEnumerator() | Where-Object { -not [string]::IsNullOrWhiteSpace($_.Value) }).Count
"Unique primary artists: $($uniqueArtists.Count)"
"Artists resolved with country: $artistFilled"
"Rows with country populated: $filled / $($rows.Count)"
Get-Content -Path $p -TotalCount 8
