# 🚀 Phase 1 開發者速查表

## 快速參考卡片

### 🔧 組件位置
```
SidebarNav.astro    src/components/Layout/SidebarNav.astro (515行)
TabBar.astro        src/components/Layout/TabBar.astro (492行)
HeaderBar.astro     src/components/Layout/HeaderBar.astro (464行)
Layout.astro        src/layouts/Layout.astro (365行)
```

---

## 🎨 CSS設計令牌

| 變數 | 值 | 用途 |
|------|-----|------|
| `--c-bg-app` | #030305 | 應用背景 |
| `--c-bg-glass` | hsla(240,10%,6%,0.85) | 玻璃面板 |
| `--c-bg-glass-hover` | hsla(240,10%,12%,0.88) | 懸停狀態 |
| `--c-border` | hsla(0,0%,100%,0.06) | 邊框顏色 |
| `--c-text-primary` | #f3f4f6 | 主文本 |
| `--c-text-secondary` | #9ca3af | 次文本 |
| `--c-text-muted` | #4b5563 | 靜音文本 |
| `--c-accent` | #3b82f6 | 強調色(藍) |
| `--c-success` | #10b981 | 成功(綠) |
| `--c-danger` | #ef4444 | 危險(紅) |
| `--w-sidebar` | 260px | 側邊欄寬 |
| `--radius` | 8px | 圓角 |
| `--ease-out` | cubic-bezier(0.16,1,0.3,1) | 動畫曲線 |

### 使用示例:
```css
background: var(--c-bg-glass);
color: var(--c-text-primary);
border-color: var(--c-border);
```

---

## ⌨️ 快捷鍵列表

### 全局
| 快捷鍵 | 功能 |
|--------|------|
| `Ctrl + B` | 切換側邊欄折疊 |
| `Ctrl + F` | (預留) 全局搜尋焦點 |

### 標籤頁
| 快捷鍵 | 功能 |
|--------|------|
| `Ctrl + Tab` | 下一個標籤 |
| `Ctrl + Shift + Tab` | 上一個標籤 |
| `Right Arrow` | 下一個標籤 (含焦點) |
| `Left Arrow` | 上一個標籤 (含焦點) |
| `右鍵點擊` | 標籤內容菜單 |

---

## 💾 localStorage鍵參考

| 鍵 | 類型 | 用途 |
|----|------|------|
| `tw-sidebar-collapsed` | boolean | 側邊欄顯示狀態 |
| `tw-workspace-Analysis-collapsed` | boolean | 分析工作區折疊狀態 |
| `tw-workspace-Research-collapsed` | boolean | 研究工作區折疊狀態 |
| `tw-workspace-Portfolio-collapsed` | boolean | 投資組合工作區折疊狀態 |
| `tw-tabs` | JSON array | 標籤列表 |
| `tw-active-tab` | string | 活躍標籤ID |
| `tw-stock-theme` | string | 主題設定 ('light'\|'dark') |
| `tw-user-preferences` | JSON | (預留) 用戶偏好 |

### 讀取示例:
```javascript
// 獲取側邊欄狀態
const isCollapsed = localStorage.getItem('tw-sidebar-collapsed') === 'true';

// 讀取活躍標籤
const activeTabId = localStorage.getItem('tw-active-tab');

// 解析標籤列表
const tabs = JSON.parse(localStorage.getItem('tw-tabs') || '[]');
```

---

## 🔌 API和方法

### SidebarNav 公開方法
```javascript
// 切換側邊欄折疊
document.getElementById('sidebar-toggle')?.click();

// 手動保存工作區狀態
localStorage.setItem(`tw-workspace-${name}-collapsed`, String(collapsed));

// 標記活躍項
document.querySelector('[href="' + currentPath + '"]')?.classList.add('active');
```

### TabBar 全局API
```javascript
// 打開新標籤頁
window.openTab(label, href, icon)
// 示例:
window.openTab("台積電", "/stocks/2330", "📊")

// 存取標籤管理器 (內部使用)
const tabManager = document.querySelector('#tabs-container')?.__tabManager;
```

### TabManager 類方法
```typescript
interface TabManager {
  addTab(tab: TabItem): void
  closeTab(id: string): void
  switchTab(id: string): void
  closeOtherTabs(id: string): void
  closeRightTabs(id: string): void
  reorderTabs(fromIndex: number, toIndex: number): void
  render(): void
  save(): void
}

interface TabItem {
  id: string
  label: string
  href: string
  icon: string
  closeable: boolean
}
```

### HeaderBar 搜尋API
```javascript
// 搜尋輸入監聽
document.getElementById('global-search-input')?.addEventListener('input', (e) => {
  const query = e.target.value.toLowerCase();
  // 實時過濾searchData
});

// 建議列表
const searchData = [
  { label: '2330 台積電', href: '/stocks/2330', icon: '📊', category: 'Stock' },
  // ...
];
```

---

## 🎯 常見操作

### 新增工作區項
在 `SidebarNav.astro` 中找到工作區陣列:
```astro
const workspaces = [
  {
    name: 'Analysis',
    label: '分析工作室',
    icon: '📊',
    items: [
      // 在這裡新增
      { label: '新項目', href: '/new-page', icon: '🆕' }
    ]
  }
];
```

### 新增搜尋建議
在 `HeaderBar.astro` 中找到 `searchData`:
```javascript
const searchData = [
  // ...
  { label: '自訂股票', href: '/stocks/1234', icon: '📈', category: 'Stock' }
];
```

### 自訂側邊欄顏色
編輯 `SidebarNav.astro` 的 `<style>` 區段:
```css
:root {
  --sidebar-bg: #some-color;
  --sidebar-text: #some-color;
}
```

### 禁用標籤關閉
在 TabBar 初始化中設置:
```javascript
{ 
  id: 'home',
  label: 'Home',
  href: '/',
  icon: '🏠',
  closeable: false  // ← 防止該標籤被關閉
}
```

---

## 📊 數據流

### 側邊欄狀態流
```
用戶點擊
    ↓
.workspace.toggle('collapsed')
    ↓
localStorage.setItem()
    ↓
視覺更新
    ↓
頁面刷新時恢復
```

### 標籤頁狀態流
```
用戶操作
    ↓
TabManager 方法
    ↓
更新 this.tabs Map
    ↓
save() → localStorage
    ↓
render() → 更新DOM
    ↓
顯示新狀態
```

### 搜尋結果流
```
用戶輸入
    ↓
input 事件監聽
    ↓
過濾 searchData
    ↓
限制 8 個結果
    ↓
生成 HTML
    ↓
顯示建議
```

---

## 🔧 調試技巧

### 檢查localStorage
```javascript
// 列出所有tw-*鍵
Object.keys(localStorage)
  .filter(key => key.startsWith('tw-'))
  .forEach(key => console.log(key, localStorage.getItem(key)));

// 清除所有狀態 (重置應用)
Object.keys(localStorage)
  .filter(key => key.startsWith('tw-'))
  .forEach(key => localStorage.removeItem(key));
```

### 驗證TabManager
```javascript
// 檢查標籤列表
const tabs = JSON.parse(localStorage.getItem('tw-tabs') || '[]');
console.table(tabs);

// 檢查活躍標籤
console.log('Active:', localStorage.getItem('tw-active-tab'));
```

### 監控動畫性能
```javascript
// Chrome DevTools > Performance
// 記錄拖放操作，檢查FPS (應為60fps)
```

---

## 🚨 常見問題與解決

### 側邊欄不折疊
```javascript
// 檢查localStorage是否阻塞
console.log(localStorage.getItem('tw-sidebar-collapsed'));

// 手動切換
document.getElementById('sidebar-nav')?.classList.toggle('collapsed');
```

### 標籤頁不持久化
```javascript
// 檢查localStorage配額
try {
  localStorage.setItem('test', 'test');
  console.log('localStorage可用');
} catch (e) {
  console.log('localStorage滿了', e);
}
```

### 搜尋不顯示結果
```javascript
// 檢查搜尋輸入事件
const input = document.getElementById('global-search-input');
console.log('Input value:', input?.value);
console.log('Panel visible:', document.getElementById('search-suggestions')?.classList);
```

---

## 📱 響應式測試

### 斷點列表
```css
桌面:     >1024px (完整功能)
平板:     768px-1024px (側邊欄成抽屜)
手機:     <480px (最小化)
```

### 測試命令
```bash
# 在 Chrome DevTools 中
# 1. F12 開發工具
# 2. Ctrl+Shift+M (切換設備模式)
# 3. 選擇 Responsive 或特定設備
# 4. 測試斷點行為
```

---

## 🔒 安全檢查清單

- [x] 無 XSS 漏洞 (Astro自動轉義)
- [x] localStorage 內容非機敏 (狀態唯一)
- [x] 無 localStorage 跨域存取 (單源)
- [x] 無 CSRF 風險 (靜態內容)
- [x] CSP 相容 (Astro預設)

---

## 📈 性能最佳實踐

### localStorage 最佳實踐
```javascript
// ✅ 好
const collapsed = localStorage.getItem('tw-sidebar-collapsed') === 'true';

// ❌ 差
const state = JSON.parse(localStorage.getItem('tw-sidebar-collapsed'));
```

### 事件監聽最佳實踐
```javascript
// ✅ 好 (委派)
document.addEventListener('click', (e) => {
  if (e.target.closest('.workspace-toggle')) {
    // 處理
  }
});

// ❌ 差 (多個監聽)
document.querySelectorAll('.workspace-toggle').forEach(el => {
  el.addEventListener('click', () => {});
});
```

### DOM 查詢最佳實踐
```javascript
// ✅ 好 (快取)
const sidebar = document.getElementById('sidebar-nav');
sidebar?.classList.toggle('collapsed');

// ❌ 差 (重複查詢)
document.getElementById('sidebar-nav')?.classList.toggle('collapsed');
document.getElementById('sidebar-nav')?.style.color = 'red';
```

---

## 🎓 更多資源

### 文檔
- **PHASE1_COMPLETION.md** - 技術規格 (1000+行)
- **PHASE1_QUICK_START.md** - 快速開始
- **PROJECT_COMPLETION_REPORT.md** - 完成報告

### 官方資源
- [Astro 文檔](https://docs.astro.build)
- [Astro 組件](https://docs.astro.build/guides/components)
- [Astro TypeScript](https://docs.astro.build/guides/typescript)

---

## 📞 支持

### 快速開發循環
```bash
# 啟動開發伺服器
npm run dev

# 在另一個終端測試構建
npm run build

# 預覽構建輸出
npm run preview
```

### 調試啟動
```bash
# 啟用詳細日誌
npm run dev -- --verbose

# 清除快取後重新構建
rm -rf .astro dist node_modules/.vite
npm run build
```

---

**最後更新**: 2026年2月1日  
**維護者**: GitHub Copilot  
**許可證**: MIT (假設)

*此速查表應定期更新以反映Phase 2的新增更改。*
