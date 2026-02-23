# 模組 1：資料採集層 (Data Ingestion)

這是專案的基石，負責穩定獲取原始數據。

## 核心功能

- **API 集成**：串接 Yahoo Finance API 或 FinMind 獲取歷史與即時股價。
- **爬蟲模組**：針對交易所官網（如 證交所）爬取三大法人籌碼、融資融券及財報數據。
- **數據清洗 (ETL)**：處理停牌、除權息調整（還原股價）以及缺失值補件。

## 包含的規格文件

- [001-data-sources.md](./001-data-sources.md)：外部資料來源定義與抓取腳本
- [002-data-build.md](./002-data-build.md)：資料建構流程與 ETL
- [003-storage-engines.md](./003-storage-engines.md)：SQLite 本地持久化儲存機制
