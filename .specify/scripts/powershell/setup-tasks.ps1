#!/usr/bin/env pwsh
# Setup task phase for a feature

[CmdletBinding()]
param(
    [switch]$Json,
    [switch]$Help
)

$ErrorActionPreference = 'Stop'

# Show help if requested
if ($Help) {
    Write-Output "用法: ./setup-tasks.ps1 [-Json] [-Help]"
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

$tasksFile = $paths.TASKS
$tasksFileName = Split-Path $tasksFile -Leaf

# Copy task template if it exists, otherwise note it or create empty file
$template = Join-Path $paths.REPO_ROOT '.specify/templates/tasks-template.md'
if (Test-Path $tasksFile) {
    Write-Output "任務檔案已存在於 $tasksFile，跳過建立。"
}
elseif (Test-Path $template) { 
    Copy-Item $template $tasksFile
    Write-Output "已將任務模板複製到 $tasksFile"
}
else {
    Write-Warning "於 $template 找不到任務模板"
    # 若模板不存在，建立基礎任務檔案
    New-Item -ItemType File -Path $tasksFile | Out-Null
    Write-Output "已建立空的 $tasksFileName"
}

# Output results
if ($Json) {
    $result = [PSCustomObject]@{ 
        FEATURE_SPEC = $paths.FEATURE_SPEC
        TASKS_FILE   = $tasksFile
        SPECS_DIR    = $paths.FEATURE_DIR
        BRANCH       = $paths.CURRENT_BRANCH
    }
    $result | ConvertTo-Json -Compress
}
else {
    Write-Output "FEATURE_SPEC: $($paths.FEATURE_SPEC)"
    Write-Output "TASKS_FILE: $tasksFile"
    Write-Output "SPECS_DIR: $($paths.FEATURE_DIR)"
    Write-Output "BRANCH: $($paths.CURRENT_BRANCH)"
}
