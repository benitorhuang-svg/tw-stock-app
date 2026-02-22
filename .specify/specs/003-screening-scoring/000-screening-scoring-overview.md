# 模組 3：選股濾鏡與權重層 (Screening & Scoring)

定義篩選邏輯，過濾出目標清單。

## 核心功能
- **多因子篩選 (Multi-Factor Selection)**：
  例：技術面 (股價 > 20MA) + 基本面 (EPS > 0) + 籌碼面 (外資連買 3 日)。
- **評分機制**：為不同因子設定權重，由系統產出當日「推薦排行」。

## 包含的規格文件
- [001-data-access.md](./001-data-access.md)：資料存取服務（負責提供篩選器快取功能）
- [002-business-services.md](./002-business-services.md)：業務層級服務與投資組合邏輯
- [003-strategy-screener.md](./003-strategy-screener.md)：自動化多面向選股決策與綜合策略評分
