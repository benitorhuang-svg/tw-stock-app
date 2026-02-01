# CSS Coding Standards & Guidelines

本文件基於 Harry Roberts 的 CSS Guidelines，為本專案的樣式開發提供統一標準，確保樣式的可維護性 (Maintainable)、清晰度 (Readable) 及延展性 (Scalable)。

## 1. 文件剖析 (Document Anatomy)

### 1.1 目錄大綱 (Table of Contents)
大型 CSS 檔案開頭必須包含目錄，方便快速定位。使用 `$SECTION` 標記。

```css
/*------------------------------------*\
    $CONTENTS
\*------------------------------------*/
/**
 * CONTENTS............目錄
 * SETTINGS............CSS 變數與 Token
 * TOOLS...............Mixins 與 Functions
 * GENERIC.............Reset 與 Normalize
 * ELEMENTS............基礎 HTML 元素
 * OBJECTS.............佈局與通用模式 (OOCSS)
 * COMPONENTS..........專屬元件
 * UTILITIES...........輔助類別 (Style Trumps)
 */
```

### 1.2 區段標題 (Section Titles)
區段之間保留 5 行間距，標題使用固定格式。

```css
/*------------------------------------*\
    $SECTION-NAME
\*------------------------------------*/
```

## 2. 命名規範 (Naming Conventions)

### 2.1 BEM 表示法
元件建議採用 BEM (Block, Element, Modifier) 命名，避免樣式耦合。
- **Block**: `.card {}`
- **Element**: `.card__header {}`
- **Modifier**: `.card--featured {}`

### 2.2 JS 鉤子 (JS Hooks)
**嚴禁**將行為與樣式綁在同一個 class 上。
- 專供 JS 選取的類別加前綴 `.js-` (如 `.js-toggle-sidebar`)。
- 樣式邏輯則使用 `.is-active`, `.has-error` 等狀態類別。

## 3. 選取器規範 (Selectors)

### 3.1 嚴禁使用 ID
選取器中 **絕對不要使用 ID** (`#some-id`)，因為其權重過高且無法複用。

### 3.2 避免過修飾選取器 (Over-qualified)
- 不要寫 `ul.nav`，直接寫 `.nav`。
- 不要寫 `.sidebar h3 span`，應直接給 span 一個 class。

### 3.3 註解標記範例
對於特定元素的 class，可使用註解標記其適用範圍：
`/*ul*/.nav {}`

## 4. 樣式撰寫技巧

### 4.1 屬性排列順序
按 **相關性** 排列，而非字母順序。
1. 定位 (Positioning)
2. 盒模型 (Box-model: margin, padding, border)
3. 字體/顏色 (Typography/Color)
4. 其它 (Transitions, opacity, etc.)

### 4.2 避免魔數 (Magic Numbers)
避免使用「剛好生效」的數字。
- ❌ `top: 37px;` (因為父層剛好是 37px)
- ✅ `top: 100%;` 或使用 `var(--nav-h)`

### 4.3 優先寫 HTML
建構新元件時，必須先寫好 HTML，再依據結構撰寫 CSS，避免多餘的樣式。

## 5. 版面配置 (Layout)
- 元件不應定義寬度，由上層網格系統決定。
- **永遠不要**定義元件的高度 (除了圖片或固定尺寸物)。
- 展示內容與佈局網格分開。

---

*Last Updated: 2026-02-01*
