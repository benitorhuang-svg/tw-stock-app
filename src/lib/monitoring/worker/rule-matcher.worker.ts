/**
 * M4: Rule Matcher Worker
 * 負責在客戶端背景高效比對警示規則
 */

interface AlertRule {
    symbol: string;
    condition: '>' | '<' | '>=' | '<=';
    threshold: number;
}

let rulesMap: Map<string, AlertRule[]> = new Map();

self.onmessage = (e: MessageEvent) => {
    const { type, payload } = e.data;

    // T005: 構建/更新 Rules Hash Map (O(1) 搜索優化)
    if (type === 'UPDATE_RULES') {
        rulesMap.clear();
        for (const rule of payload as AlertRule[]) {
            const list = rulesMap.get(rule.symbol) || [];
            list.push(rule);
            rulesMap.set(rule.symbol, list);
        }
        return;
    }

    // T006: 執行命中比對
    if (type === 'TICK') {
        const hits: any[] = [];
        const ticks = payload; // [symbol, price] or full object

        for (const tick of ticks) {
            const [symbol, price] = [tick[0], parseFloat(tick[7])]; // 依據 TWSE 格式
            const rules = rulesMap.get(symbol);

            if (rules) {
                for (const rule of rules) {
                    let matched = false;
                    if (rule.condition === '>' && price > rule.threshold) matched = true;
                    if (rule.condition === '<' && price < rule.threshold) matched = true;
                    if (rule.condition === '>=' && price >= rule.threshold) matched = true;
                    if (rule.condition === '<=' && price <= rule.threshold) matched = true;

                    if (matched) {
                        hits.push({ symbol, rule, price });
                    }
                }
            }
        }

        if (hits.length > 0) {
            self.postMessage({ type: 'ALERTS', payload: hits });
        }
    }
};
