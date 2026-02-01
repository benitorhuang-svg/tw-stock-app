/**
 * Toast 通知系統
 * 用於顯示操作成功/失敗等提示訊息
 */

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastOptions {
    message: string;
    type?: ToastType;
    duration?: number; // 毫秒
    action?: {
        label: string;
        onClick: () => void;
    };
}

class ToastManager {
    private container: HTMLElement | null = null;
    private toasts: Map<number, HTMLElement> = new Map();
    private nextId = 0;

    private getContainer(): HTMLElement {
        if (this.container) return this.container;

        // 創建容器
        this.container = document.createElement('div');
        this.container.id = 'toast-container';
        this.container.style.cssText = `
            position: fixed;
            bottom: 24px;
            right: 24px;
            z-index: 9999;
            display: flex;
            flex-direction: column-reverse;
            gap: 12px;
            pointer-events: none;
        `;
        document.body.appendChild(this.container);

        return this.container;
    }

    show(options: ToastOptions): number {
        const {
            message,
            type = 'info',
            duration = 3000,
            action
        } = options;

        const id = this.nextId++;
        const container = this.getContainer();

        // 創建 toast 元素
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.style.cssText = `
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 14px 20px;
            background: var(--bg-secondary, #1a1a2e);
            border: 1px solid var(--border, rgba(255,255,255,0.1));
            border-radius: 12px;
            color: var(--text-primary, #f0f0f0);
            font-size: 0.9rem;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            pointer-events: auto;
            animation: toastSlideIn 0.3s ease-out;
            max-width: 360px;
        `;

        // 圖標
        const icons: Record<ToastType, string> = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };

        // 邊框顏色
        const borderColors: Record<ToastType, string> = {
            success: '#00d4aa',
            error: '#ff4757',
            warning: '#ff9500',
            info: '#0099ff'
        };

        toast.style.borderLeftWidth = '3px';
        toast.style.borderLeftColor = borderColors[type];

        toast.innerHTML = `
            <span class="toast-icon">${icons[type]}</span>
            <span class="toast-message" style="flex: 1;">${message}</span>
            ${action ? `<button class="toast-action" style="
                background: none;
                border: 1px solid currentColor;
                color: ${borderColors[type]};
                padding: 6px 12px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 0.85rem;
            ">${action.label}</button>` : ''}
            <button class="toast-close" style="
                background: none;
                border: none;
                color: var(--text-secondary, #a0a0b0);
                cursor: pointer;
                font-size: 1.2rem;
                padding: 0;
                line-height: 1;
            ">×</button>
        `;

        // 綁定事件
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn?.addEventListener('click', () => this.dismiss(id));

        const actionBtn = toast.querySelector('.toast-action');
        if (actionBtn && action) {
            actionBtn.addEventListener('click', () => {
                action.onClick();
                this.dismiss(id);
            });
        }

        container.appendChild(toast);
        this.toasts.set(id, toast);

        // 自動消失
        if (duration > 0) {
            setTimeout(() => this.dismiss(id), duration);
        }

        return id;
    }

    dismiss(id: number): void {
        const toast = this.toasts.get(id);
        if (!toast) return;

        toast.style.animation = 'toastSlideOut 0.2s ease-in forwards';

        setTimeout(() => {
            toast.remove();
            this.toasts.delete(id);
        }, 200);
    }

    dismissAll(): void {
        this.toasts.forEach((_, id) => this.dismiss(id));
    }

    // 便捷方法
    success(message: string, duration?: number) {
        return this.show({ message, type: 'success', duration });
    }

    error(message: string, duration?: number) {
        return this.show({ message, type: 'error', duration: duration ?? 5000 });
    }

    warning(message: string, duration?: number) {
        return this.show({ message, type: 'warning', duration });
    }

    info(message: string, duration?: number) {
        return this.show({ message, type: 'info', duration });
    }
}

// 單例
export const toast = new ToastManager();

// 添加動畫樣式
if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes toastSlideIn {
            from {
                opacity: 0;
                transform: translateX(100%);
            }
            to {
                opacity: 1;
                transform: translateX(0);
            }
        }
        @keyframes toastSlideOut {
            from {
                opacity: 1;
                transform: translateX(0);
            }
            to {
                opacity: 0;
                transform: translateX(100%);
            }
        }
    `;
    document.head.appendChild(style);
}
