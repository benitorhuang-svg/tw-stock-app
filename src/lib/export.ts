/**
 * 匯出工具
 * 支援 CSV、Excel (XLSX)、JSON 格式匯出
 */

// ================== CSV 匯出 ==================

export function exportToCSV(
    data: any[],
    columns: { key: string; label: string }[],
    filename: string = 'export.csv'
): void {
    if (data.length === 0) {
        console.warn('No data to export');
        return;
    }

    // 建立 CSV 內容
    const headers = columns.map(c => c.label).join(',');
    const rows = data.map(row =>
        columns.map(col => {
            const value = row[col.key];
            // 處理包含逗號或引號的值
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                return `"${value.replace(/"/g, '""')}"`;
            }
            return value ?? '';
        }).join(',')
    );

    // 加入 BOM 以支援中文
    const BOM = '\uFEFF';
    const csvContent = BOM + [headers, ...rows].join('\n');

    // 下載
    downloadFile(csvContent, filename, 'text/csv;charset=utf-8');
}

// ================== JSON 匯出 ==================

export function exportToJSON(data: any[], filename: string = 'export.json'): void {
    const jsonContent = JSON.stringify(data, null, 2);
    downloadFile(jsonContent, filename, 'application/json');
}

// ================== 通用下載函式 ==================

function downloadFile(content: string | Blob, filename: string, mimeType?: string): void {
    const blob = typeof content === 'string'
        ? new Blob([content], { type: mimeType || 'text/plain' })
        : content;

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// ================== 匯出 Blob ==================

export function exportBlob(blob: Blob, filename: string): void {
    downloadFile(blob, filename);
}

// ================== 股票資料匯出 ==================

export function exportStocksCSV(stocks: any[]): void {
    exportToCSV(stocks, [
        { key: 'symbol', label: '代號' },
        { key: 'name', label: '名稱' },
        { key: 'price', label: '股價' },
        { key: 'change', label: '漲跌' },
        { key: 'changePercent', label: '漲跌幅%' },
        { key: 'pe', label: '本益比' },
        { key: 'pb', label: '淨值比' },
        { key: 'yield', label: '殖利率%' },
        { key: 'roe', label: 'ROE%' },
        { key: 'eps', label: 'EPS' },
        { key: 'volume', label: '成交量' }
    ], `stocks_${formatDateForFilename()}.csv`);
}

export function exportPortfolioCSV(portfolio: any[]): void {
    exportToCSV(portfolio, [
        { key: 'symbol', label: '代號' },
        { key: 'stock_name', label: '名稱' },
        { key: 'shares', label: '持股數' },
        { key: 'avg_cost', label: '平均成本' },
        { key: 'currentPrice', label: '現價' },
        { key: 'cost', label: '成本' },
        { key: 'value', label: '市值' },
        { key: 'pl', label: '損益' },
        { key: 'plPercent', label: '報酬率%' }
    ], `portfolio_${formatDateForFilename()}.csv`);
}

export function exportTransactionsCSV(transactions: any[]): void {
    exportToCSV(transactions, [
        { key: 'date', label: '日期' },
        { key: 'symbol', label: '代號' },
        { key: 'type', label: '類型' },
        { key: 'shares', label: '股數' },
        { key: 'price', label: '價格' },
        { key: 'fee', label: '手續費' },
        { key: 'tax', label: '稅金' },
        { key: 'notes', label: '備註' }
    ], `transactions_${formatDateForFilename()}.csv`);
}

// ================== 日期格式化 ==================

function formatDateForFilename(): string {
    const now = new Date();
    return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
}

// ================== 匯入 CSV ==================

export async function parseCSV(file: File): Promise<{ headers: string[]; rows: string[][] }> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            const text = e.target?.result as string;
            const lines = text.split(/\r?\n/).filter(line => line.trim());

            if (lines.length === 0) {
                reject(new Error('Empty file'));
                return;
            }

            const headers = parseCSVLine(lines[0]);
            const rows = lines.slice(1).map(parseCSVLine);

            resolve({ headers, rows });
        };

        reader.onerror = () => reject(reader.error);
        reader.readAsText(file, 'UTF-8');
    });
}

function parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }

    result.push(current.trim());
    return result;
}
