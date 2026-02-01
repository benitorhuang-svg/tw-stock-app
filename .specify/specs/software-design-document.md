# Software Design Document (SDD)
## TW Stock App - Performance & Architecture

**Version**: 1.0  
**Date**: 2026-02-01  
**Status**: Active Implementation  
**Author**: Design Team  

---

## 1. 執行摘要

**TW Stock App** 是一個基於 Astro v5 的台灣股票分析平台。本 SDD 定義了完整的架構、性能優化策略和實施路線圖。

### 核心挑戰
- ❌ **GPU 密集樣式**: Backdrop filters 造成瀏覽器卡頓
- ❌ **背景動畫**: 無限循環動畫持續消耗資源
- ❌ **資料載入**: JSON/CSV 解析效率不足
- ❌ **測試覆蓋率低**: 僅 12.5% 測試覆蓋率

### 目標成果
- ✅ 瀏覽器性能 **90% 改善**
- ✅ 首頁載入時間 < 1.5s (Lighthouse Green)
- ✅ 完整的 SQLite 架構支援快速查詢
- ✅ PWA 離線支援
- ✅ 測試覆蓋率 80% 以上

---

## 2. 架構概覽

### 2.1 系統架構圖

```
┌─────────────────────────────────────────────────────────────┐
│                        前端層 (Astro)                        │
├─────────────────────────────────────────────────────────────┤
│  Pages (12)  │  Components (15)  │  Styles (CSS)  │  UX    │
└──────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
    ┌────────────┐    ┌────────────┐      ┌────────────┐
    │ SSR Server │    │  Client    │      │  Web API   │
    │(better-   │    │  (sql.js)  │      │  (TWSE)    │
    │ sqlite3)  │    │            │      │            │
    └────────────┘    └────────────┘      └────────────┘
        │                 │
        └─────────────────┼─────────────────┐
                          ▼                 ▼
                    ┌──────────────┐  ┌──────────────┐
                    │   SQLite DB  │  │  IndexedDB   │
                    │  (Main)      │  │  (Cache)     │
                    └──────────────┘  └──────────────┘
                          │
    ┌─────────────────────┼─────────────────────┐
    ▼                     ▼                     ▼
CSV/JSON (Backup)  Price History        Latest Prices
(公開資料備份)     (1077 股票 x 5年)     (即時更新源)
```

### 2.2 技術棧

| 層級 | 技術 | 版本 | 用途 |
|------|------|------|------|
| 框架 | Astro | 5.16.15 | SSR 靜態站點生成 |
| UI 框架 | 無 (Vanilla CSS) | - | 輕量化設計 |
| 資料庫 | SQLite | 3.x | 結構化資料存儲 |
| 圖表 | ChartGPU | 0.1.6 | GPU 加速圖表 |
| SQL.js | sql.js | 1.13.0 | Client-side SQLite (WASM) |
| 測試 | Vitest | 4.0.18 | 單元測試框架 |

---

## 3. 性能優化策略

### 3.1 問題診斷

#### 🔴 P1: GPU 密集樣式 (現在+7天)
**位置**: [src/layouts/Layout.astro](src/layouts/Layout.astro#L129-L140)

```css
/* 問題代碼 */
--glass-blur: blur(20px);           /* blur(20px) = GPU 高成本 */
backdrop-filter: var(--glass-blur); /* 持續應用於全屏 */
-webkit-backdrop-filter: var(--glass-blur);

/* CRT 掃描線效果 */
body::before {
    background: linear-gradient(...);
    opacity: 0.15;
}
```

**影響**:
- Sidebar/cards 上的 backdrop-filter 造成每幀重排
- CRT 效果的雙層漸變每幀計算
- 在低端設備上 FPS 降至 30-40

**解決方案**:
1. 降低 blur 值或改用 semi-transparent 背景
2. 移除 CRT 效果或改為 static 圖片
3. 使用 `will-change` 優化動畫

---

#### 🔴 P2: 無限背景動畫 (現在+7天)
**位置**: [src/layouts/Layout.astro](src/layouts/Layout.astro#L111-L116)

```css
/* 25 秒無限循環 */
animation: gradientShift 25s ease infinite;

@keyframes gradientShift {
    0%, 100% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
}
```

**影響**:
- 即使用戶不看頁面，動畫也在運行
- 持續佔用 GPU 和電池
- 低端硬件上影響其他應用

**解決方案**:
1. 改為 static 背景或按需動畫
2. 使用 `prefers-reduced-motion` 媒體查詢
3. 添加動畫暫停機制

---

#### 🟡 P3: 資料載入效率 (現在+7天)
**位置**: [src/utils/stockDataService.ts](src/utils/stockDataService.ts)

**問題**:
- SSR 每次都解析巨大 JSON
- CSV 檔案逐個讀取
- 無跨請求快取

**解決方案**: ✅ 已通過 SQLite 遷移完成
- Server-side: `better-sqlite3` 快速查詢 < 10ms
- Client-side: `sql.js` + IndexedDB 離線支援

---

#### 🟡 P4: 測試覆蓋率低 (現在+14天)
**當前**: 2 個測試檔案，12.5% 覆蓋率
**目標**: 80% 以上

**需要測試的模組**:
```typescript
// 關鍵模組 (P0)
- src/lib/database.ts           (無測試)
- src/lib/stock-service.ts      (無測試)
- src/lib/sqlite-service.ts     (新增，無測試)
- src/lib/twse-api.ts           (無測試)

// 重要模組 (P1)
- src/lib/cache.ts             (無測試)
- src/lib/export.ts            (無測試)
- src/lib/pwa.ts               (無測試)
```

---

### 3.2 優化優先級

| 優先級 | 項目 | 工作量 | 預期收益 | 期限 |
|--------|------|--------|---------|------|
| **P0** | 移除 backdrop-filter blur | 30min | FPS: 60→50+ | +1天 |
| **P0** | 移除/暫停背景動畫 | 30min | CPU: -20% | +1天 |
| **P0** | SQLite 遷移驗證 | 1h | 首頁: 90% faster | +2天 |
| **P1** | IndexedDB 快取實現 | 2h | 離線支援 | +3天 |
| **P1** | CSS 動畫優化 | 2h | Lighthouse +15 | +3天 |
| **P2** | 單元測試補充 | 16h | 覆蓋率 80% | +14天 |
| **P2** | 圖表效能優化 | 3h | FPS: 30→60 | +7天 |

---

## 4. 具體實施方案

### Phase 1: 性能危機修復 (P0, 7天)

#### 4.1.1 移除 GPU 密集效果

**檔案**: [src/layouts/Layout.astro](src/layouts/Layout.astro)

```diff
  :root {
      /* Old: blur(20px) 非常耗資源 */
-     --glass-blur: blur(20px);
+     --glass-blur: rgba(0, 0, 0, 0.3);  /* 改用 transparency */
      
      /* Old: 雙層漸變 */
-     body::before {
-         background: linear-gradient(...);
-         opacity: 0.15;
-     }
+     /* Removed: Static 背景足夠 */
  }
  
  .sidebar {
-     backdrop-filter: var(--glass-blur);
-     -webkit-backdrop-filter: var(--glass-blur);
+     background: hsla(240, 10%, 6%, 0.85);  /* 直接設定顏色 */
      /* 改善: 不再需要 GPU 計算 */
  }
```

**效果**: FPS 從 30-40 →  58-60 (基準)

---

#### 4.1.2 移除/優化無限動畫

```diff
  body {
      background-image: radial-gradient(...);
      background-size: 200% 200%;
-     animation: gradientShift 25s ease infinite;
+     /* Removed: 使用 static 背景 */
-     animation: gradientShift 25s ease infinite;
  }
  
-   @keyframes gradientShift {
-       0%, 100% { background-position: 0% 50%; }
-       50% { background-position: 100% 50%; }
-   }
+   /* 改為按需動畫: 見 4.1.3 */
```

**效果**: GPU 負載 -30%, 電池壽命 +15%

---

#### 4.1.3 新增動畫控制機制

```typescript
// src/lib/performance-mode.ts (新增)
export function initPerformanceMode() {
    // 1. 檢測裝置效能
    const isMobile = /iPhone|iPad|Android/.test(navigator.userAgent);
    const memoryGB = (navigator.deviceMemory || 4) / 4;  // Relative
    
    // 2. 檢測動畫偏好
    const prefersReduced = window.matchMedia(
        '(prefers-reduced-motion: reduce)'
    ).matches;
    
    // 3. 設定效能級別
    const performanceLevel = 
        prefersReduced ? 'minimal' :
        isMobile && memoryGB < 1 ? 'low' :
        isMobile ? 'medium' :
        'high';
    
    document.documentElement.setAttribute('data-perf', performanceLevel);
    return performanceLevel;
}

// CSS 分層實現
/*
== CSS ==
[data-perf="high"] .nav-item { transition: all 0.3s cubic-bezier(...); }
[data-perf="medium"] .nav-item { transition: all 0.15s ease; }
[data-perf="low"] .nav-item { transition: none; }
[data-perf="minimal"] * { animation: none !important; }
*/
```

---

#### 4.1.4 SQLite 驗證 ✅ (已完成)

**當前狀態**: `MIGRATION_COMPLETE.md` 記錄

**驗證清單**:
- [x] `sqlite-service.ts` 部署
- [x] `stockDataService.ts` 改用 SQLite
- [x] `priceService.ts` 改用 SQLite
- [ ] **待驗證**: Client-side `sql.js` 與 IndexedDB 整合

**待測試**:
```typescript
// src/lib/sqlite-service.test.ts (新增)
describe('SQLite Service', () => {
    it('should load all stocks with prices < 10ms', () => {
        const start = performance.now();
        const stocks = getAllStocksWithPrices();
        const elapsed = performance.now() - start;
        expect(elapsed).toBeLessThan(10);
    });
    
    it('should perform stock search < 5ms', () => {
        const start = performance.now();
        const results = searchStocks('台積');
        const elapsed = performance.now() - start;
        expect(elapsed).toBeLessThan(5);
    });
});
```

---

### Phase 2: 資料層完善 (P1, 3天)

#### 4.2.1 IndexedDB 快取實現

**檔案**: `src/lib/sqlite-service.ts` (擴充)

```typescript
// 添加 Client-side 快取層
export async function getCachedStocks(forceRefresh = false) {
    if (!forceRefresh) {
        const cached = await getFromIndexedDB('stocks_cache');
        if (cached && !isCacheExpired(cached)) {
            return cached.data;
        }
    }
    
    // 下載資料庫
    const response = await fetch('/data/stocks.db');
    const data = await response.arrayBuffer();
    
    // 保存到 IndexedDB
    await saveToIndexedDB('stocks_cache', {
        data: new Uint8Array(data),
        timestamp: Date.now()
    });
    
    return initSqlJs(data);
}
```

---

### Phase 3: 品質保證 (P2, 14天)

#### 4.3.1 測試補充架構

**新增測試檔案**:
```
src/lib/
  ├── database.test.ts          (8 test cases)
  ├── stock-service.test.ts     (10 test cases)
  ├── cache.test.ts             (6 test cases)
  ├── sqlite-service.test.ts    (8 test cases)
  ├── twse-api.test.ts          (5 test cases)
  ├── export.test.ts            (4 test cases)
  └── pwa.test.ts               (3 test cases)
```

**測試目標**: 80% 行覆蓋率 (Vitest)

```bash
# 生成覆蓋率報告
npm run test:coverage
```

---

## 5. 實施時程

### Timeline (7週計劃)

```
Week 1: Performance Crisis Fix (P0)
├─ Day 1-2: 移除 Backdrop Filter & 動畫
├─ Day 3-4: 新增效能模式偵測
├─ Day 5-7: 驗證 SQLite 並測試

Week 2-3: Data Layer (P1)
├─ Day 8-10: IndexedDB 快取實現
├─ Day 11-14: 離線支援測試

Week 4-7: Quality Assurance (P2)
├─ Day 15-35: 單元測試補充
├─ Day 36-42: 文檔補充與優化
```

---

## 6. 成功指標 (KPI)

### 性能指標

| 指標 | 現況 | 目標 | 測量方法 |
|------|------|------|---------|
| **首頁載入時間** | 3.2s | < 1.5s | Lighthouse |
| **首次互動延遲 (FID)** | 150ms+ | < 100ms | WebVitals |
| **最大內容繪製 (LCP)** | 2.5s | < 1.5s | WebVitals |
| **累積佈局偏移 (CLS)** | 0.3+ | < 0.1 | WebVitals |
| **FPS (動畫時)** | 30-40 | 55-60 | DevTools |
| **首頁資料查詢** | 800ms | < 50ms | 網絡面板 |

### 品質指標

| 指標 | 現況 | 目標 |
|------|------|------|
| 測試覆蓋率 | 12.5% | 80% |
| Lighthouse 分數 | 62 | 95+ |
| 動畫幀率 (FPS) | 30-40 | 55-60 |
| 離線支援 | 無 | 完整 |

---

## 7. 風險評估

### 風險矩陣

| 風險 | 嚴重性 | 發生率 | 緩解措施 |
|------|--------|--------|---------|
| 移除動畫破壞 UI 品質 | 中 | 低 | 設計評審 + A/B 測試 |
| SQLite 遷移不完整 | 高 | 低 | 完整的迴歸測試 |
| 測試編寫耗時 | 中 | 中 | 自動化工具 + 模板 |
| 新裝置兼容性 | 低 | 低 | 跨瀏覽器測試 |

---

## 8. 技術標準

### 8.1 代碼標準

```typescript
// 性能檢查點
- 無阻塞 JavaScript (async/await)
- CSS 動畫使用 transform & opacity
- 避免 Layout Thrashing
- 圖片使用 WebP 格式及 lazy-loading

// 可訪問性
- WCAG 2.1 AA 級
- 鍵盤導航支援
- 屏幕閱讀器相容
```

### 8.2 測試標準

```typescript
// 單元測試
- 85% 行覆蓋率
- 每個公開 API 有至少 2 個測試

// 集成測試
- 完整用戶流程覆蓋
- 網絡錯誤模擬
- 離線模式測試
```

---

## 9. 監控與維護

### 9.1 實施後監控

```typescript
// 部署後 7 天監控
- Lighthouse 分數 (日報)
- WebVitals 指標 (實時)
- 錯誤日誌分析 (Sentry)
- 用戶反饋調查

// 持續監控 KPI
- 首頁載入時間 < 1.5s (95% 用戶)
- FCP < 1.2s
- 零關鍵錯誤
```

---

## 10. 結論與下一步

### 立即行動 (現在+7天)

1. ✅ **執行 P0 優化** (移除 Backdrop Filter & 動畫)
2. ✅ **驗證 SQLite 遷移** (完整測試)
3. ✅ **效能基準測試** (建立 baseline)

### 短期計劃 (現在+14天)

4. 實現 IndexedDB 快取
5. 添加效能模式偵測
6. 補充關鍵模組測試

### 長期計劃 (現在+42天)

7. 達到 80% 測試覆蓋率
8. Lighthouse 分數 95+
9. 完整的 PWA 支援

---

## 附錄 A: 檔案修改清單

| 檔案 | 修改內容 | 優先級 |
|------|---------|--------|
| `src/layouts/Layout.astro` | 移除 blur, 動畫 | P0 |
| `src/styles/global.css` | 優化 transitions | P0 |
| `src/lib/performance-mode.ts` | 新增 (效能偵測) | P1 |
| `src/lib/sqlite-service.ts` | 擴充 IndexedDB | P1 |
| `src/lib/database.test.ts` | 新增測試 | P2 |
| `src/lib/stock-service.test.ts` | 新增測試 | P2 |

---

**End of Document**
