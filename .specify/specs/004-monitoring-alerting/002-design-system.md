# 002 — 設計系統 (Design System)

> 模組 4：定義應用程式的視覺語言、元件規範與美學原則，確保 UI/UX 的一致性與高級感。

## 美學與設計哲學

本專案採用 **"Premium Financial Terminal" (高級金融終端)** 風格，結合現代 Web 設計趨勢：
1. **Glassmorphism (玻璃擬態)**：大量使用 `backdrop-filter: blur()` 與半透明背景，營造分層感。
2. **Vibrant Accents (鮮豔強調色)**：在深色背景上使用高飽和度的青綠、亮藍與螢火紅作為數據指標色。
3. **Cyber-Premium Motion (電競級動效)**：使用 `cyber-reveal` 動畫與 CSS 變數控制的發光效果 (`glow-effect`)。
4. **Performance-Aware UI**：根據裝置效能自動降級視覺效果（如關閉毛玻璃或動畫）。

## 色彩規範 (Color Palette)

### 核心色彩 (Dark Mode - Default)
| 變數 | 顏色 | 預覽/說明 |
|------|------|----------|
| `--c-bg-app` | `#0a0a0f` | 深藍黑背景 |
| `--c-bg-glass` | `hsla(230, 25%, 10%, 0.65)` | 標準玻璃背景 |
| `--c-accent` | `#3b82f6` | 品牌亮藍 |
| `--c-success` | `#22c55e` | 上漲/正面指標 (Vibrant Green) |
| `--c-danger` | `#f43f5e` | 下跌/負面指標 (Rose Red) |
| `--c-text-primary`| `#f8fafc` | 純白文字 |

### 亮色模式 (Light Mode)
- **背景**：`#f8fafc` (Slate 50)
- **強調色**：調低明度以確保對比度符合 WCAG (如 `--positive: #059669`)。

## 字體與排版 (Typography)

| 類別 | 字體 | 用途 |
|------|------|------|
| **Display** | `Outfit`, sans-serif | 標題、大數據（顯示專業感與張力） |
| **Body** | `Inter`, sans-serif | 內文、說明（極高可讀性） |
| **Data/Mono** | `JetBrains Mono` | 股票代碼、價格、座標（等寬確保數據對齊） |

### 關鍵字級設定
- `display`: `800 32px` (極粗、緊湊字母間隔)
- `heading`: `700 18px`
- `body`: `400 13px`

## 空間與形狀 (Layout & Radius)

- **圓角規範**：
  - `sm`: `8px` (按鈕、輸入框)
  - `md`: `14px` (小卡片)
  - `lg`: `24px` (主容器、大卡片)
- **陰影規範**：
  - `shadow-glow`: 帶有色彩渲染的微光效果。
  - `shadow-panel`: 深色模式下的深度陰影 (`rgba(0,0,0,0.7)`)。

## 動效系統 (Motion System)

### Cyber Reveal Animation
用於頁面加載或元件進入時的優雅浮現。
```css
@keyframes cyber-reveal {
  from { opacity: 0; transform: translateY(20px) scale(0.98); filter: blur(10px); }
  to { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
}
```

### 效能分級回應
| 等級 (`data-perf`) | 特性描述 |
|-----------------|---------|
| `high` | 全開：300ms 動效、重度毛玻璃、動態發光。 |
| `medium` | 平衡：150ms 動效、中度毛玻璃。 |
| `low` | 節能：關閉毛玻璃、禁用複雜動畫、即時切換。 |
| `minimal` | 極簡：`animation: none !important`。 |

## Atomic Design 實作規範

本專案採用原子化設計來解構 UI，確保設計的可維護性：

1. **Atoms (原子)**:
   - 專注於單一 HTML 標籤。
   - 樣式高度依賴 `tokens.css`。
   - 不應包含任何 API 呼叫或複雜狀態。

2. **Molecules (分子)**:
   - 組合多個原子以實施特定功能。
   - 可包含組件內部的 UI 狀態（如：下拉選單是否開啟）。

3. **Organisms (生物)**:
   - 封裝完整的業務功能模組。
   - **允許** 與 Layer 4-6 的服務進行互動（例如透過 `import` 引用分析函式）。
   - 應具備獨立的測試用例。

4. **Templates & Pages**:
   - 負責佈局 (Grid/Flex) 與資料注入 (Data Fetching)。
   - Pages 僅負責路由與 SSR 資料獲取，並將資料向下傳遞給生物。

## UI 元件範例

1. **Premium Card**：
   - 背景使用 `var(--c-bg-glass)`。
   - Hover 時位移 `-4px` 並增加 `shadow-panel`。
   - 左側邊框色彩指示（選用）。

2. **Glow Effect**：
   - 使用 CSS Variables (`--mouse-x`, `--mouse-y`) 實作隨游標移動的漸層發光（正在優化為 `requestAnimationFrame` 版本以降低 CPU 負載）。

## 待辦任務 (UI/UX Tasks)

- [ ] **T8-01**: 建立完整的 Storybook 或設計預覽頁面，展示所有 Token 組合。
- [ ] **T8-02**: 完善 Ligh Mode 的對比度檢查，確保符合 AA 級別。
- [ ] **T8-03**: 優化 `100dvh` 在 iOS/Android 上的佈局抖動問題 (T7-04 的設計部分)。
- [ ] **T8-04**: 新增「色盲友善」模式，提供上漲/下跌顏色自定義。
