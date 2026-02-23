# 007 — AI 報告與智能警示分頁 (AI Report & Alerts Tab)

## 1. 頁面定位與虛擬助理體驗

這是整個 Stock Terminal 最具未來感、最高附加價值的分頁。它是「被動閱讀 (AI 總結)」與「主動出擊 (Smart Alerts)」的無縫接軌介面。不再需要使用者盯盤、畫線自己找買點。大型語言模型 (LLM) 已將海量數字提煉成行動綱領，再配合「一鍵設定警示」，徹底貫徹「由資料到決策」的終極防線。

## 2. 佈局與生成式介面設計 (GenUI Layout)

**背景與風格**：打破全是圖表的傳統介面限制。此處採用**雜誌式的流暢排版 (Typography)**，文字佔據主導優勢，背景伴隨著若有似無的紫粉/紫藍色的未來感呼吸漸層 (Gradient Pulse effect `bg-gradient-to-br from-indigo-900/20 to-fuchsia-900/10`)。

**佈局架構 (Split 60/40 Ratio)**：

- **左側：AI 深度綜合解析 (AI Synthesis Report, `col-span-7`)**：
    - **頂端：情感溫度計 (Sentiment Gauge)**：一個立體的半圓形速度表 (Speedometer)。指針由紅 (極空) 劃向綠 (極多)。旁邊緊貼一句「AI 共識：**短多長空，建議減碼**」。
    - **文章本體 (Markdown Rendered View)**：
        - 精緻的段落間距 (`leading-relax`, `space-y-6`) 呈現：基本面亮點 / 籌碼動能追蹤 / 技術型態掃描 / 風險提示。
        - **強標籤 (GenUI Highlight)**：文章中提及的特殊術語（如：`投信連四買`, `跌破 MA20`）不再是死文字。它們渲染成發光的 `Chip`，滑鼠停駐 (Hover) 該文字時，會展開一顆帶有該部位圖表的迷你懸浮卡 (Mini-chart Tooltip)。
- **右側：行動觸發中心 (Actionable Alert Center, `col-span-5`)**：
    - 這是一個類似 To-Do List 排版的行動面板。
    - **AI 推薦行動 (Suggested Triggers)**：這是畫龍點睛之處。系統透過讀取左側的文章，直接產出兩到三條做好的警報開關：
        - 📍 _AI 發現目前股價接近月線支撐。_
        - 👉 (推薦開關卡片)：「當 `[股票代號]` 收盤價 `[向下突破]` 技術指標 `[MA20]`，發送 App 推播。」 — 一鍵 `[] 啓用 (Toggle)`。
    - **自建警示大廳 (Custom Rules Engine)**：
        - 下方列出使用者過去在這邊設定過的自訂條件式，以及一個「+ 新增客製化警示」的高級發光按鈕。

## 3. 生命週期與生成動畫 (Lifecycle & Gen Animations)

- **LLM 生成中狀態 (Loading / Streaming State)**：
    - 在使用者點進來，但 AI 報告還在透過 API 流式傳輸 (Streaming, Server-Sent Events) 時：
    - 左側文章區會顯示**發光游標 (Blinking Cursor `animate-pulse`)** 與逐字吐出字元的打字機特效 (Typewriter Effect)。
    - 右側的情感溫度計，指針會在 0 - 100 之間做「尋找中」的來回擺盪，直到報告生成完畢才固定在某個數值。
- **儲存與回饋**：當使用者在右側右鍵點擊（或是開啟 Toggle）設定警示成功，右上角立即彈出 `ToastNotification`：「✅ 守護者已啟動，將 24H 關注此條件」。

## 4. 核心元件與 Props (Component Architecture)

- **`AIReportReader.tsx` (Organism)**
    - Props: `markdownContent: string, isStreaming: boolean, sentimentScore: number`
    - 使用 `@tailwindcss/typography` (`prose prose-invert`) 管理所有標題與列表樣式。
- **`SuggestedAlertToggle.tsx` (Molecule)**
    - Props: `ruleConcept: string, ruleCondition: ConditionObj, isActive: boolean`
    - 此元件負責將複雜的 JSON Condition，轉譯為人類易讀的語句卡片。
- **`ConditionBuilderDialog.tsx` (Modal)**
    - 複雜的 if-statement 建立器。採用極簡 Select Box 設計 (`If [Select Variable] [Select Operator] [Text/Select Value]`)。
