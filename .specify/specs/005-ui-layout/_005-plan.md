# Implementation Plan: 005-ui-layout

**Branch**: `005-ui-layout` | **Date**: 2026-02-23 | **Spec**: [001-layout-overview.md](./001-layout-overview.md), [002-tab-overview.md](./002-tab-overview.md)

## Summary

本階段 (`M5: UI Layout & Micro-Animations`) 負責將 M1~M4 所計算、快取的高速資料 ( $O(1)$ 或 $O(\log N)$ ) 完美地映射為「Glassmorphism (玻璃擬態)」風格的金融終端機。本階段不會參雜冗贅的運算迴圈，專注於利用 Astro 的 SSR、View Transitions、與 `ChartGPU` 來渲染 10 萬點級別的法人的散布圖，並搭配流暢無阻的 `<a data-astro-prefetch>` 提供「點擊瞬移」的魔術體驗。這將是與使用者最靠近的一塊拼圖。

## Technical Context

**Language/Version**: Astro 5.0+ / React / TailwindCSS (如果使用者決議套用)\~ / CSS Vanilla
**Primary Dependencies**: `ChartGPU` ( WebGL 渲染), `astro:transitions`, `framer-motion` (微動效)
**Storage**: N/A (純展示端)
**Testing**: Vitest (`test/m5-ui-components.test.ts` 驗證 DOM, a11y, 與 ErrorBoundary 保護網)
**Target Platform**: Browser / Server-Side Rendering
**Project Type**: Astro Web Application
**Performance Goals**: LCP < 1.0s, CLS 趨近於 0 (防版面跳動)，全站轉場切換均不得讓主執行緒阻塞。10萬點的 WebGL 圖表必須確保 > 55 FPS。
**Constraints**: 面對 HTTP 404 或資料來源崩潰，絕對不能引發全頁白畫面 (White Screen Object Array Mapping Crash)，所有 Organisms (元件群) 必須實作 `ErrorBoundary` 加上深色骨架屏 (`Shimmer Skeleton`) 作為 Fallback。
**Scale/Scope**: 5 大分析分頁 (技術、籌碼、營收、估值、智慧)，支援響應式 (Desktop, Mobile) 與系統主題。

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **Premium Web App Design**: ✅ 完全依循玻璃擬態、Hover 光暈跟隨的高級視角。
- **Atomic Design**: ✅ 組件明確將 Atoms/Molecules/Organisms 抽離。
- **Performance Standards**: ✅ Astro Island Architecture (部分水合) 與 SSR 搭配 View Transitions，符合嚴格限速，防堵過多的 `mousemove` DOM 操作。

## Project Structure

### Documentation (this feature)

```text
.specify/specs/005-ui-layout/
├── [prefix]-clarification.md
└── 005-plan.md             # 本檔案
```

### Source Code

```text
src/                            # M5: 全站頁面與佈局引擎
├── layouts/                    # (A) 版面外殼 (Shell)
│   ├── MainTerminal.astro      # 全局包含 Sidebar, Header 的終端機
│   └── BaseHead.astro          # SEO, View Transitions, Prefetch 設置
├── components/                 # (B) 原子化設計元件群
│   ├── atoms/                  # Badge, Skeleton, Button
│   ├── molecules/              # DataRow, SearchBar
│   └── organisms/              # (最重要) StockHero, ChartCanvas, RealtimeToast
├── pages/                      # (C) 路由進入點
│   ├── index.astro             # 總覽 / 大盤 Dashboard
│   ├── screener.astro          # M3 篩選器介面
│   └── stock/[symbol].astro    # M1~M2 個股細節 5 大分頁
└── styles/                     # (D) 設計系統
    ├── index.css               # 玻璃擬態與動態變量定義區
    └── design-tokens.css       # 顏色/間距 (HSL)
```

**Structure Decision**: 這是最標準的 Astro 架構，完全捨棄 SPA 架構以獲取極致的初始化速度。`Organisms` 等重型組件必須配置 `client:visible` 或 `client:idle` ( Island Architecture )，讓使用者不需要等待 1MB 的 JS 載入就能看到首屏數據。
