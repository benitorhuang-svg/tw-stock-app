/**
 * PWA 功能
 * Service Worker 註冊、安裝提示
 */

// Service Worker 註冊
export function registerServiceWorker(): void {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', async () => {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js', {
                    scope: '/'
                });
                console.log('[PWA] Service Worker registered:', registration.scope);

                // 檢查更新
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    if (newWorker) {
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                // 有新版本可用
                                showUpdateNotification();
                            }
                        });
                    }
                });
            } catch (error) {
                console.error('[PWA] Service Worker registration failed:', error);
            }
        });
    }
}

// 安裝提示
let deferredPrompt: BeforeInstallPromptEvent | null = null;

interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function setupInstallPrompt(): void {
    window.addEventListener('beforeinstallprompt', (e: Event) => {
        e.preventDefault();
        deferredPrompt = e as BeforeInstallPromptEvent;

        // 顯示安裝按鈕
        showInstallButton();
    });

    window.addEventListener('appinstalled', () => {
        console.log('[PWA] App installed');
        deferredPrompt = null;
        hideInstallButton();
    });
}

function showInstallButton(): void {
    const existing = document.getElementById('pwa-install-btn');
    if (existing) return;

    const btn = document.createElement('button');
    btn.id = 'pwa-install-btn';
    btn.innerHTML = '📲 安裝 App';
    btn.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 12px 20px;
        background: var(--accent, #00d4aa);
        color: #000;
        border: none;
        border-radius: 24px;
        font-weight: 600;
        cursor: pointer;
        z-index: 9999;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        animation: slideUp 0.3s ease-out;
    `;

    btn.addEventListener('click', installApp);
    document.body.appendChild(btn);

    // 加入動畫
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideUp {
            from { transform: translateY(100px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);
}

function hideInstallButton(): void {
    const btn = document.getElementById('pwa-install-btn');
    if (btn) {
        btn.remove();
    }
}

export async function installApp(): Promise<void> {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    console.log('[PWA] Install prompt outcome:', outcome);
    deferredPrompt = null;
    hideInstallButton();
}

// 更新通知
function showUpdateNotification(): void {
    const notification = document.createElement('div');
    notification.innerHTML = `
        <div style="
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: var(--bg-secondary, #1a1a2e);
            border: 1px solid var(--border, rgba(255,255,255,0.1));
            border-radius: 12px;
            padding: 16px 24px;
            display: flex;
            align-items: center;
            gap: 16px;
            z-index: 10000;
            box-shadow: 0 4px 20px rgba(0,0,0,0.4);
        ">
            <span>🔄 有新版本可用</span>
            <button id="update-btn" style="
                padding: 8px 16px;
                background: var(--accent, #00d4aa);
                color: #000;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-weight: 600;
            ">更新</button>
        </div>
    `;

    document.body.appendChild(notification);

    notification.querySelector('#update-btn')?.addEventListener('click', () => {
        window.location.reload();
    });
}

// 檢查是否為 PWA 模式
export function isPWA(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true;
}

// 初始化 PWA
export function initPWA(): void {
    registerServiceWorker();
    setupInstallPrompt();

    if (isPWA()) {
        document.documentElement.classList.add('pwa-mode');
        console.log('[PWA] Running as installed app');
    }
}
