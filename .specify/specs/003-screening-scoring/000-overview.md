# 000 — 模組 3：選股濾鏡與條件查詢 (Screening & Scoring)

> 既然 M1 的建構腳本已經幫我們把 1700 檔股票的「過去、現在」資料整合成一顆高速結構化的 `SQLite DB`。那 `M3: Screening (選股器)` 就不再是用 JavaScript `map/reduce` 來篩選，而是要建立一個**極限效能的 SQL 查詢產生器 (Query Builder) 與 緩存機制 (Caching)**。

## 職責與架構翻轉 (Paradigm Shift)

| 傳統 O(N) 對象篩選 (已淘汰)                                 | SQL 索引選股 O(1) (The New Era)                              |
| ----------------------------------------------------------- | ------------------------------------------------------------ |
| 瀏覽器必須把 1700 個物件載進 JS 記憶體，再執行 `filter()`。 | 透過 `001` 中建好的 `sqlite-service.ts` 的 `QueryBuilder`。  |
| 使用 `if (stock.pe < 15 && stock.macd > 0)`。               | 組裝成 `SELECT * FROM features WHERE pe < 15 AND macd > 0`。 |
| 超巨大效能浪費且容易 OOM。                                  | SQLite 利用多重索引在 10ms 內完成跨條件聯集並直接返回結果。  |

## 包含的規格文件

- `001-query-builder.md`：Screener 條件引擎與 SQL 編譯器。
- `002-preset-strategies.md`：預設選股策略（價值、動能）對應的 SQL WHERE 子句匯編。
