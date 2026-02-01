/**
 * 圖表工具提示
 * K線圖 hover 顯示價格詳情
 */

export interface TooltipData {
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
    change?: number;
    changePercent?: number;
}

// 創建全域 tooltip 元素
let tooltipElement: HTMLElement | null = null;

function createTooltip(): HTMLElement {
    if (tooltipElement) return tooltipElement;

    tooltipElement = document.createElement('div');
    tooltipElement.id = 'chart-tooltip';
    tooltipElement.style.cssText = `
        position: fixed;
        display: none;
        background: rgba(26, 26, 46, 0.95);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 8px;
        padding: 12px 16px;
        font-size: 13px;
        color: #f0f0f0;
        pointer-events: none;
        z-index: 10000;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
        min-width: 150px;
    `;

    document.body.appendChild(tooltipElement);
    return tooltipElement;
}

export function showTooltip(x: number, y: number, data: TooltipData): void {
    const tooltip = createTooltip();

    const isUp = data.close >= data.open;
    const changeColor = isUp ? '#00d4aa' : '#ff4757';
    const arrow = isUp ? '▲' : '▼';

    tooltip.innerHTML = `
        <div style="font-weight: 600; margin-bottom: 8px; color: #a0a0b0;">${data.date}</div>
        <div style="display: grid; grid-template-columns: auto auto; gap: 4px 16px;">
            <span style="color: #a0a0b0;">開盤</span>
            <span style="text-align: right;">${data.open.toFixed(2)}</span>
            <span style="color: #a0a0b0;">最高</span>
            <span style="text-align: right; color: #ff4757;">${data.high.toFixed(2)}</span>
            <span style="color: #a0a0b0;">最低</span>
            <span style="text-align: right; color: #00d4aa;">${data.low.toFixed(2)}</span>
            <span style="color: #a0a0b0;">收盤</span>
            <span style="text-align: right; font-weight: 700;">${data.close.toFixed(2)}</span>
            ${data.volume ? `
                <span style="color: #a0a0b0;">成交量</span>
                <span style="text-align: right;">${(data.volume / 1000).toFixed(0)}K</span>
            ` : ''}
        </div>
        ${data.change !== undefined ? `
            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.1); color: ${changeColor};">
                ${arrow} ${data.change >= 0 ? '+' : ''}${data.change.toFixed(2)} (${data.changePercent?.toFixed(2)}%)
            </div>
        ` : ''}
    `;

    // 計算位置，避免超出畫面
    const tooltipRect = tooltip.getBoundingClientRect();
    const padding = 10;
    let left = x + padding;
    let top = y + padding;

    if (left + tooltipRect.width > window.innerWidth) {
        left = x - tooltipRect.width - padding;
    }
    if (top + tooltipRect.height > window.innerHeight) {
        top = y - tooltipRect.height - padding;
    }

    tooltip.style.left = `${Math.max(padding, left)}px`;
    tooltip.style.top = `${Math.max(padding, top)}px`;
    tooltip.style.display = 'block';
}

export function hideTooltip(): void {
    if (tooltipElement) {
        tooltipElement.style.display = 'none';
    }
}

/**
 * 綁定圖表 hover 事件
 */
export function bindChartTooltip(
    canvas: HTMLCanvasElement,
    ohlcData: TooltipData[],
    options: {
        padding: { left: number; right: number; top: number; bottom: number };
        getBarIndex: (mouseX: number) => number;
    }
): () => void {
    const { getBarIndex } = options;

    const handleMouseMove = (e: MouseEvent) => {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const index = getBarIndex(mouseX);

        if (index >= 0 && index < ohlcData.length) {
            const data = ohlcData[index];
            const prevClose = index > 0 ? ohlcData[index - 1].close : data.open;
            const change = data.close - prevClose;
            const changePercent = (change / prevClose) * 100;

            showTooltip(e.clientX, e.clientY, {
                ...data,
                change,
                changePercent
            });
        } else {
            hideTooltip();
        }
    };

    const handleMouseLeave = () => {
        hideTooltip();
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    // 返回清理函式
    return () => {
        canvas.removeEventListener('mousemove', handleMouseMove);
        canvas.removeEventListener('mouseleave', handleMouseLeave);
    };
}
