# 台股分析 App 全面優化計畫

## 優化目標

將台股分析 App 從 MVP 升級為功能完整、效能優異的專業級應用程式。

---

## Phase 1: 效能優化 (高優先) ⏱️ ~30 min

### 1.1 預生成價格快照
- [ ] 建立 `scripts/build-price-snapshot.js` 腳本
- [ ] 在 build 時生成 `public/data/latest_prices.json`
- [ ] 修改 [stockDataService.ts](file:///c:/Users/user/Documents/PowerQuery/tw-stock-app/src/utils/stockDataService.ts) 讀取快照而非 1077 個 CSV

### 1.2 分頁載入
- [ ] [stocks/index.astro](file:///c:/Users/user/Documents/PowerQuery/tw-stock-app/src/pages/stocks/index.astro) 改為客戶端分頁 (每頁 50 筆)
- [ ] 加入分頁控制元件
- [ ] [filter.astro](file:///c:/Users/user/Documents/PowerQuery/tw-stock-app/src/pages/filter.astro) 同樣加入分頁

### 1.3 資料快取
- [ ] 加入 localStorage 快取機制
- [ ] 快取有效期 1 小時

---

## Phase 2: 圖表功能 📈 ~45 min

### 2.1 K 線圖表
- [ ] 安裝 `lightweight-charts` (輕量級 TradingView 圖表)
- [ ] 建立 `components/StockChart.astro`
- [ ] 整合到個股詳情頁 `stocks/[symbol].astro`

### 2.2 技術指標
- [ ] 建立 `utils/technicalIndicators.ts`
- [ ] 實作 MA (5/10/20/60 日均線)
- [ ] 實作 RSI (14 日)
- [ ] 實作 MACD
- [ ] 圖表上疊加技術指標

---

## Phase 3: 投資組合 💼 ~30 min

### 3.1 買賣記錄
- [ ] 建立 `pages/portfolio.astro` 投資組合頁面
- [ ] 設計交易記錄資料結構
- [ ] 建立新增/編輯交易的 Modal

### 3.2 損益計算
- [ ] 計算持倉成本、現價、損益 %
- [ ] 顯示投資組合總覽儀表板
- [ ] 支援匯出交易記錄 CSV

---

## Phase 4: UI/UX 升級 🎨 ~45 min

### 4.1 熱力圖
- [ ] 建立 `components/Heatmap.astro`
- [ ] 產業板塊 TreeMap 視覺化
- [ ] 股票大小依市值、顏色依漲跌

### 4.2 Skeleton Loading
- [ ] 建立 [components/Skeleton.astro](file:///c:/Users/user/Documents/PowerQuery/tw-stock-app/src/components/Skeleton.astro)
- [ ] 各頁面載入時顯示骨架屏

### 4.3 響應式優化
- [ ] 審視所有頁面手機版面
- [ ] Sidebar 改為 hamburger menu
- [ ] 觸控友善的按鈕尺寸

---

## Phase 5: PWA 支援 📱 ~20 min

### 5.1 Service Worker
- [ ] 建立 `public/sw.js`
- [ ] 快取靜態資源
- [ ] 離線時顯示快取資料

### 5.2 Manifest
- [ ] 建立 `public/manifest.json`
- [ ] 設定 App 圖示、顏色
- [ ] 支援「加到主畫面」

---

## Phase 6: 資料增強 📊 ~30 min

### 6.1 基本面資料
- [ ] 擴充價格 CSV 包含 PE、PB、殖利率
- [ ] 或建立獨立的 `fundamentals.json`
- [ ] 個股詳情頁顯示財務指標

### 6.2 法人買賣超 (選擇性)
- [ ] 整合 TWSE API 取得法人進出
- [ ] 顯示近期買賣超走勢

---

## 實作順序

建議按照 Phase 順序實作，每個 Phase 完成後可獨立運作：

```
Phase 1 → Phase 2 → Phase 4 → Phase 3 → Phase 5 → Phase 6
(效能)    (圖表)    (UI)     (組合)    (PWA)    (資料)
```

---

## 是否開始實作？

請確認此計畫，我將依序實作各 Phase。
