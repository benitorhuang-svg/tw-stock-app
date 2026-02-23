#!/usr/bin/env pwsh
# Setup clarification phase for a feature

[CmdletBinding()]
param(
    [switch]$Json,
    [switch]$Help
)

$ErrorActionPreference = 'Stop'

# Show help if requested
if ($Help) {
    Write-Output "用法: ./setup-clarify.ps1 [-Json] [-Help]"
    Write-Output "  -Json     以 JSON 格式輸出結果"
    Write-Output "  -Help     顯示此說明訊息"
    exit 0
}

# Load common functions
. "$PSScriptRoot/common.ps1"

# Get all paths and variables from common functions
$paths = Get-FeaturePathsEnv

# Check if we're on a proper feature branch
if (-not (Test-FeatureBranch -Branch $paths.CURRENT_BRANCH -HasGit:$paths.HAS_GIT)) { 
    exit 1 
}

# Ensure the feature directory exists
New-Item -ItemType Directory -Path $paths.FEATURE_DIR -Force | Out-Null

$clarifyFile = $paths.CLARIFY
$clarifyFileName = Split-Path $clarifyFile -Leaf

# Copy clarify template if it exists, otherwise create a basic one
$template = Join-Path $paths.REPO_ROOT '.specify/templates/clarification-template.md'
if (Test-Path $template) { 
    Copy-Item $template $clarifyFile -Force
    Write-Output "已將需求釐清模板複製到 $clarifyFile"
}
else {
    Write-Warning "於 $template 找不到需求釐清模板"
    Write-Output "正在建立預設的 $clarifyFileName..."
    
    $defaultContent = @"
# 需求釐清 (Clarification)

> 本文件用於在撰寫 Plan 之前，強制釐清系統架構的盲區與邊界條件。

## 1. 資料來源與依賴 (Data Sources & Dependencies)
- [ ] 此 Feature 需要哪些既有的 DB Tables？
- [ ] 是否需要串接新的外部 API？呼叫頻率與限制為何？

## 2. 邊界條件與極端測試 (Edge Cases)
- [ ] 若資料為空 (Null/0/Empty Array)，畫面的 Fallback 是什麼？
- [ ] 若網路斷線或 DB 鎖死 (Locked/Timeout)，錯誤處理機制為何？

## 3. 效能與資源評估 (Performance Impact)
- [ ] 此功能是否會產生 `$O(N^2)` 以上的運算複雜度？
- [ ] 是否需要建立新的 DB Index (索引) 來支撐查詢速度？
- [ ] 是否需要設定 Cache (Redis/IndexedDB)？
"@
    # Use .NET to write UTF-8 without BOM to avoid mojibake
    [System.IO.File]::WriteAllText($clarifyFile, $defaultContent, (New-Object System.Text.UTF8Encoding($False)))

}

# Output results
if ($Json) {
    $result = [PSCustomObject]@{ 
        FEATURE_SPEC = $paths.FEATURE_SPEC
        CLARIFY_FILE = $clarifyFile
        SPECS_DIR    = $paths.FEATURE_DIR
        BRANCH       = $paths.CURRENT_BRANCH
    }
    $result | ConvertTo-Json -Compress
}
else {
    Write-Output "FEATURE_SPEC: $($paths.FEATURE_SPEC)"
    Write-Output "CLARIFY_FILE: $clarifyFile"
    Write-Output "SPECS_DIR: $($paths.FEATURE_DIR)"
    Write-Output "BRANCH: $($paths.CURRENT_BRANCH)"
}
