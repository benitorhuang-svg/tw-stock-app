# TW Stock App 使用手冊

歡迎使用 TW Stock App！本手冊將帶你了解專案的安裝流程、介面導覽、資料維護與關鍵功能，讓你能充分利用平台。

---

## 🔧 安裝與設定

1. **複製倉庫**
   ```bash
   git clone https://github.com/benitorhuang-svg/tw-stock-app.git
   cd tw-stock-app
   ```

2. **安裝相依套件**
   ```bash
   npm install
   ```

3. **準備資料（僅首次執行）**
   ```bash
   npm run fetch:all         # 從 API 抓取所有 JSON
   npm run build-db          # 轉換成 SQLite 資料庫
   ```

4. **產生 PWA 圖示**
   ```bash
   node scripts/generate-pwa-icons.mjs
   ```

5. **啟動開發模式**
   ```bash
   npm run dev
   ```
   然後在瀏覽器打開 [http://localhost:3000](http://localhost:3000)。

6. **建立正式版**
   ```bash
   npm run build
   ```

7. **執行測試**
   ```bash
   npm test
   npm run test:coverage
   ```

> 💡 注意：`public/data/` 下的 JSON 檔案較大，首次抓取可能需要一分鐘左右。

---

## 🧭 應用程式導覽

此應用以終端機風格儀表板為核心，搭配多個專用頁面：

| 頁面           | URL                    | 功能說明                                      |
|----------------|------------------------|---------------------------------------------|
| 首頁 Dashboard  | `/`                    | 市場總覽、漲跌排行、SSE 即時更新              |
| 股票總覽       | `/stocks`              | 搜尋與篩選所有股票                            |
| 個股詳情       | `/stocks/[symbol]`     | K 線圖、技術指標、基本面、籌碼、AI 報告（6 分頁）
| 智慧選股       | `/screener`            | 預設與自訂篩選 + 即時回測熱力圖              |
| 即時報價       | `/live`                | TWSE SSE 資料流、閃爍報價                    |
| 法人分析       | `/institutional`       | 三大法人連續買賣排行榜                        |
| 自選股         | `/watchlist`           | 儲存在 localStorage 的個人追蹤清單            |
| 資料庫查詢     | `/database`            | 直接查詢 SQLite 與 SQL 終端機                 |

每個頁面都有互動控制項與必要時的即時資料。

---

## 📦 主要功能總覽

- **即時 SSE 推播**，市場資料推送至客戶端
- **量化終端 UI**，支援深/淺色主題、光暈效果、骨架載入
- **原子元件庫**，UI 一致性有保障
- **PWA 支援**，可離線快取、安裝與自動更新
- **篩選結果 CSV 匯出**

---

## ⚙️ 資料更新流程

工作日由 GitHub Actions 自動刷新資料，你也可以在 `scripts/` 資料夾手動執行以下腳本：

```bash
npm run fetch:list       # 股票清單
npm run fetch:revenue    # 月營收
npm run fetch:stats      # 月統計
npm run fetch:financials # 季報
npm run fetch:chips      # 籌碼資料
npm run fetch:all        # 全部以上
npm run build-db         # 轉換 JSON 至 SQLite
npm run refresh-db       # fetch:all + build-db 一鍵完成
```

這些命令會填充 `public/data/` 並重建供網頁伺服器使用的 `stocks.db`。

---

## 📱 PWA 與離線使用

- 瀏覽器提示可安裝於桌面或手機
- Service Worker 快取已訪問頁面和靜態資源
- 先前瀏覽的頁面可離線使用
- 新部署版本可自動提示更新

---

## 🛠 本地開發環境運作

1. 執行 `npm run dev` 啟動 Astro 開發伺服器
2. 開啟瀏覽器至 `http://localhost:3000`
3. 前後端程式碼支援熱重載
4. 可在 `/database` 頁面使用瀏覽器開發工具檢視 SQL 查詢

---

## 🙌 貢獻與擴充

- 程式碼符合 TypeScript 慣例；使用 `npm run lint` 進行檢查。
- 新指標可加入 `src/utils/technical-indicators`。
- 新 UI 元件放在 `src/components/{atoms,molecules,organisms}` 下。
- ETL 與抓取資料的腳本位於 `scripts/` 及 `scripts/etl/`。
- 測試放在 `src/lib` 與 `src/actions`；使用 Vitest 執行。

---

## 📄 常見問題

**Q：為什麼網站首次載入會比較慢？**
A：應用會載入大型的 WASM SQLite 資料庫以及許多 JSON 檔案；之後瀏覽器會快取它們。

**Q：可以在手機上使用嗎？**
A：可以。UI 是響應式，PWA 可安裝在手機/平板。

**Q：原始資料檔在哪裡？**
A：在 `public/data/`，由 CI 每日更新，不會提交至 git。

---

歡迎探索倉庫並自訂策略或介面元件。祝你分析順利！🎯