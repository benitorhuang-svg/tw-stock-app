#!/usr/bin/env pwsh

# Consolidated prerequisite checking script (PowerShell)
#
# This script provides unified prerequisite checking for Spec-Driven Development workflow.
# It replaces the functionality previously spread across multiple scripts.
#
# Usage: ./check-prerequisites.ps1 [OPTIONS]
#
# OPTIONS:
#   -Json               Output in JSON format
#   -RequireTasks       Require tasks.md to exist (for implementation phase)
#   -IncludeTasks       Include tasks.md in AVAILABLE_DOCS list
#   -PathsOnly          Only output path variables (no validation)
#   -Help, -h           Show help message

[CmdletBinding()]
param(
    [switch]$Json,
    [switch]$RequireTasks,
    [switch]$IncludeTasks,
    [switch]$RequireClarify,
    [switch]$PathsOnly,
    [switch]$Help
)

$ErrorActionPreference = 'Stop'

# Show help if requested
if ($Help) {
    Write-Output @"
用法: check-prerequisites.ps1 [選項]

規格驅動開發 (Spec-Driven Development) 工作流的綜合先決條件檢查。

選項:
  -Json               以 JSON 格式輸出
  -RequireTasks       要求 tasks.md 必須存在 (用於實作階段)
  -IncludeTasks       在可用文件 (AVAILABLE_DOCS) 列表中包含 tasks.md
  -PathsOnly          僅輸出路徑變數 (不進行先決條件驗證)
  -Help, -h           顯示此說明訊息

範例:
  # 檢查任務先決條件 (需要 plan.md)
  .\check-prerequisites.ps1 -Json
  
  # 檢查實作先決條件 (需要 plan.md + tasks.md)
  .\check-prerequisites.ps1 -Json -RequireTasks -IncludeTasks
  
  # 僅獲取功能路徑 (不驗證)
  .\check-prerequisites.ps1 -PathsOnly

"@
    exit 0
}

# Source common functions
. "$PSScriptRoot/common.ps1"

# Get feature paths and validate branch
$paths = Get-FeaturePathsEnv

if (-not (Test-FeatureBranch -Branch $paths.CURRENT_BRANCH -HasGit:$paths.HAS_GIT)) { 
    exit 1 
}

# If paths-only mode, output paths and exit (support combined -Json -PathsOnly)
if ($PathsOnly) {
    if ($Json) {
        [PSCustomObject]@{
            REPO_ROOT    = $paths.REPO_ROOT
            BRANCH       = $paths.CURRENT_BRANCH
            FEATURE_DIR  = $paths.FEATURE_DIR
            FEATURE_SPEC = $paths.FEATURE_SPEC
            IMPL_PLAN    = $paths.IMPL_PLAN
            TASKS        = $paths.TASKS
        } | ConvertTo-Json -Compress
    }
    else {
        Write-Output "REPO_ROOT: $($paths.REPO_ROOT)"
        Write-Output "BRANCH: $($paths.CURRENT_BRANCH)"
        Write-Output "FEATURE_DIR: $($paths.FEATURE_DIR)"
        Write-Output "FEATURE_SPEC: $($paths.FEATURE_SPEC)"
        Write-Output "IMPL_PLAN: $($paths.IMPL_PLAN)"
        Write-Output "TASKS: $($paths.TASKS)"
    }
    exit 0
}

$clarifyFile = Split-Path $paths.CLARIFY -Leaf
$planFile = Split-Path $paths.IMPL_PLAN -Leaf
$tasksFile = Split-Path $paths.TASKS -Leaf
$researchFile = Split-Path $paths.RESEARCH -Leaf
$dataModelFile = Split-Path $paths.DATA_MODEL -Leaf
$quickstartFile = Split-Path $paths.QUICKSTART -Leaf

# Validate required directories and files
if (-not (Test-Path $paths.FEATURE_DIR -PathType Container)) {
    Write-Output "錯誤: 找不到功能目錄: $($paths.FEATURE_DIR)"
    Write-Output "請先執行 /speckit.specify 建立功能結構。"
    exit 1
}

if (-not (Test-Path $paths.IMPL_PLAN -PathType Leaf)) {
    Write-Output "錯誤: 在 $($paths.FEATURE_DIR) 中找不到 $planFile"
    Write-Output "請先執行 /speckit.plan 建立實作計畫。"
    exit 1
}

# Check for tasks.md if required
if ($RequireTasks -and -not (Test-Path $paths.TASKS -PathType Leaf)) {
    Write-Output "錯誤: 在 $($paths.FEATURE_DIR) 中找不到 $tasksFile"
    Write-Output "請先執行 /speckit.tasks 建立任務清單。"
    exit 1
}

# Check for clarification.md if required
if ($RequireClarify -and -not (Test-Path $paths.CLARIFY -PathType Leaf)) {
    Write-Output "錯誤: 在 $($paths.FEATURE_DIR) 中找不到 $clarifyFile"
    Write-Output "請先執行 /speckit.clarify 概述邊界條件與資料來源。"
    exit 1
}

# Build list of available documents
$docs = @()

# Always check these optional docs
if (Test-Path $paths.RESEARCH) { $docs += $researchFile }
if (Test-Path $paths.DATA_MODEL) { $docs += $dataModelFile }
if (Test-Path $paths.CLARIFY) { $docs += $clarifyFile }

# Check contracts directory (only if it exists and has files)
if ((Test-Path $paths.CONTRACTS_DIR) -and (Get-ChildItem -Path $paths.CONTRACTS_DIR -ErrorAction SilentlyContinue | Select-Object -First 1)) { 
    $docs += 'contracts/' 
}

if (Test-Path $paths.QUICKSTART) { $docs += $quickstartFile }

# Include tasks.md if requested and it exists
if ($IncludeTasks -and (Test-Path $paths.TASKS)) { 
    $docs += $tasksFile 
}

# Output results
if ($Json) {
    # JSON output
    [PSCustomObject]@{ 
        FEATURE_DIR    = $paths.FEATURE_DIR
        AVAILABLE_DOCS = $docs 
    } | ConvertTo-Json -Compress
}
else {
    # 文本輸出
    Write-Output "功能目錄 (FEATURE_DIR):$($paths.FEATURE_DIR)"
    Write-Output "可用文件 (AVAILABLE_DOCS):"
    
    # Show status of each potential document
    Test-FileExists -Path $paths.RESEARCH -Description $researchFile | Out-Null
    Test-FileExists -Path $paths.DATA_MODEL -Description $dataModelFile | Out-Null
    Test-FileExists -Path $paths.CLARIFY -Description $clarifyFile | Out-Null
    Test-DirHasFiles -Path $paths.CONTRACTS_DIR -Description 'contracts/' | Out-Null
    Test-FileExists -Path $paths.QUICKSTART -Description $quickstartFile | Out-Null
    
    if ($IncludeTasks) {
        Test-FileExists -Path $paths.TASKS -Description $tasksFile | Out-Null
    }
}
