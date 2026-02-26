import fs from 'fs';

const filepath = 'src/components/organisms/TabTechnical.astro';
let content = fs.readFileSync(filepath, 'utf8');

// Add import
const importTechEnd = 'const { symbol, price, change, priceData } = Astro.props;\n';
content = content.replace(
    importTechEnd,
    importTechEnd +
        `import { calcMAPath, calcBollingerBands, calcRSI, calcMACD } from '../../utils/technical-indicators';\n`
);

// Replace MA
content = content.replace(
    /function calcMA\(days: number\).*?\}\n\nconst ma5Path = calcMA\(5\);\nconst ma10Path = calcMA\(10\);\nconst ma20Path = calcMA\(20\);\nconst ma60Path = calcMA\(60\);/s,
    `const ma5Path = calcMAPath(candles, 5, gap, pToY);\nconst ma10Path = calcMAPath(candles, 10, gap, pToY);\nconst ma20Path = calcMAPath(candles, 20, gap, pToY);\nconst ma60Path = calcMAPath(candles, 60, gap, pToY);`
);

// Replace BBands
content = content.replace(
    /\/\/ 🛠️ Bollinger Bands \(20, 2\)\nconst bBands = candles.*?\.filter\(Boolean\);/s,
    '// 🛠️ Bollinger Bands (20, 2)\nconst bBands = calcBollingerBands(candles, gap, pToY);'
);

// Replace RSI
content = content.replace(
    /\/\/ 📊 RSI Calculation \(14\)\nfunction calcRSI\(period = 14\) \{.*?return rsi;\n\}\nconst rsiValues = calcRSI\(14\);/s,
    '// 📊 RSI Calculation (14)\nconst rsiValues = calcRSI(candles, 14);'
);

// Replace MACD
content = content.replace(
    /\/\/ 📉 MACD \(Already mostly implemented, refining\)\nfunction calcEMA\(data: number\[\], period: number\): number\[\] \{.*?\);\n/s,
    `// 📉 MACD
const closes = candles.map(c => c.c);
const { difValues, deaValues, macdHist, macdMax } = calcMACD(closes);
`
);

// The "const closes = candles.map(c => c.c);" is already there in the replacement string, but might have been removed. Let's make sure we removed the existing one:
// But wait, the previous regex `/\/\/ 📉 MACD.*?;\n/s` captures everything up to the first `;` after a newline or something if I don't craft it carefully. Let's just do it precisely by string splitting.
