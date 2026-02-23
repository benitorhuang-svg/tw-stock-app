import fs from 'fs';

const industries = [
    { id: 'etf', name: 'ETF/基金' },
    { id: 'semiconductor', name: '半導體' },
    { id: 'electronics', name: '電子零組件' },
    { id: 'optoelectronics', name: '光電' },
    { id: 'communication', name: '通信網路' },
    { id: 'computer', name: '電腦及週邊' },
    { id: 'other-tech', name: '其他電子' },
    { id: 'finance', name: '金融' },
    { id: 'food', name: '食品' },
    { id: 'plastic', name: '塑膠' },
    { id: 'chemical', name: '化學工業' },
    { id: 'energy', name: '綠能環保' },
    { id: 'textile', name: '紡織' },
    { id: 'steel', name: '鋼鐵' },
    { id: 'rubber', name: '橡膠' },
    { id: 'paper', name: '造紙' },
    { id: 'auto', name: '汽車工業' },
    { id: 'shipping', name: '航運' },
    { id: 'biotech', name: '生技醫療' },
    { id: 'construction', name: '營建' },
    { id: 'tourism', name: '觀光' },
    { id: 'trading', name: '貿易百貨' },
    { id: 'sports-leisure', name: '休閒與運動' },
    { id: 'household', name: '生活與居家' },
    { id: 'other', name: '其他' },
];

function getSectorBySymbol(symbol) {
    // 1. Manual Overrides for Major Stocks
    const overrides = {
        2330: 'semiconductor', // TSMC
        2454: 'semiconductor', // MediaTek
        3034: 'semiconductor', // Novatek
        2317: 'electronics', // Hon Hai
        2308: 'electronics', // Delta
        2382: 'electronics', // Quanta
        2412: 'communication', // Chunghwa Telecom
        3008: 'optoelectronics', // Largan
        1301: 'plastic', // Formosa Plastic
        2002: 'steel', // China Steel
        2603: 'shipping', // Evergreen
        2609: 'shipping', // Yang Ming
        7722: 'finance', // LINEPAY (Digital finance)
        7705: 'tourism', // Tri-Sans Food
        // 99xx Overrides (The big ones)
        9910: 'sports-leisure', // Feng Tay (Shoes)
        9914: 'sports-leisure', // Merida (Bicycle)
        9921: 'sports-leisure', // Giant (Bicycle)
        9938: 'sports-leisure', // Paiho (Shoes)
        9802: 'sports-leisure', // Fulgent (Shoes)
        9917: 'household', // SECOM (Security)
        9925: 'household', // SKS (Security)
        9911: 'household', // Sakura (Home)
        9934: 'household', // Chen Lin (Home)
        9942: 'household', // Maw Soon (Auto related but household)
        9908: 'energy', // Great Taipei Gas
        9918: 'energy', // Shin Hai Gas
        9926: 'energy', // Shin Gas
        9931: 'energy', // Hsin Kao Gas
        9937: 'energy', // National Gas
        9939: 'household', // Hon Chuan (Packaging)
        9958: 'energy', // Century Iron (Offshore wind steel)
        9930: 'steel', // CHC Resources
        9940: 'construction', // Sinyi
        9945: 'construction', // Ruentex
        9946: 'construction', // San Far
    };

    if (overrides[symbol]) return overrides[symbol];

    const prefix = symbol.substring(0, 2);
    const num = parseInt(symbol);

    // 2. ETFs and Funds
    if (prefix === '00' || prefix === '01' || prefix === '03' || prefix === '04') return 'etf';

    // 3. Main Industry Sectors
    if (prefix === '11') return 'construction'; // Cement
    if (prefix === '12') return 'food';
    if (prefix === '13') return 'plastic';
    if (prefix === '14') return 'textile';
    if (prefix === '15' || prefix === '16') return 'electronics'; // Machinery/Cable
    if (prefix === '17') return 'chemical';
    if (prefix === '18') return 'construction'; // Glass/Ceramic
    if (prefix === '19') return 'paper';
    if (prefix === '20') return 'steel';
    if (prefix === '21') return 'rubber';
    if (prefix === '22') return 'auto';
    if (prefix === '23') return 'semiconductor';
    if (prefix === '24') return 'computer';
    if (prefix === '25') return 'construction';
    if (prefix === '26') return 'shipping';
    if (prefix === '27') return 'tourism';
    if (prefix === '28') return 'finance';
    if (prefix === '29') return 'trading';

    // 4. Technology & Special OTC Ranges
    if (prefix === '30') return 'electronics'; // Components
    if (prefix === '31') return 'communication';
    if (prefix === '32') return 'electronics';
    if (prefix === '33') return 'computer';
    if (prefix === '34') return 'optoelectronics';
    if (prefix === '35') return 'semiconductor';
    if (prefix === '36') return 'communication';
    if (prefix === '37') return 'other-tech'; // Distribution
    if (prefix === '38') return 'other-tech';
    if (prefix === '39') return 'other';

    if (prefix === '41') return 'biotech';
    if (prefix === '45') return 'electronics'; // Machinery
    if (prefix === '47') return 'chemical';
    if (prefix === '49') return 'semiconductor';

    if (prefix === '52') return 'semiconductor'; // IC Design
    if (prefix === '53') return 'electronics';
    if (prefix === '54') return 'semiconductor';
    if (prefix === '55') return 'construction'; // OTC Construction
    if (prefix === '56') return 'shipping'; // OTC Shipping
    if (prefix === '57') return 'tourism'; // OTC Tourism
    if (prefix === '58') return 'finance'; // OTC Bank
    if (prefix === '59') return 'trading'; // OTC Trading

    if (prefix === '60') return 'finance'; // Securities
    if (prefix === '61') return 'electronics';
    if (prefix === '62') return 'semiconductor';
    if (prefix === '64') return 'semiconductor';
    if (prefix === '65') return 'biotech';
    if (prefix === '66') return 'semiconductor';
    if (prefix === '67' || prefix === '68' || prefix === '69') return 'other-tech';

    if (prefix === '80') return 'semiconductor';
    if (prefix === '81') return 'electronics';
    if (prefix === '82') return 'other-tech';
    if (prefix === '83') return 'energy'; // Environment/Various -> group in energy
    if (prefix === '84') return 'biotech'; // Life Science
    if (prefix === '89') return 'trading';

    // Energy series (Specific 6xxx-7xxx stocks)
    if (prefix === '68' || prefix === '69' || prefix === '77' || prefix === '99') {
        const energyStocks = ['6806', '6869', '6873', '6994', '7740', '7786'];
        if (energyStocks.includes(symbol)) return 'energy';
    }

    // 5. 99xx Range (Comprehensive)
    if (prefix === '99') {
        if (num >= 9940 && num <= 9946) return 'construction';
        if (num === 9958 || num === 9930) return 'steel';
        if (num >= 9917 && num <= 9925) return 'household'; // Security/Bicycle/Home
        if (num === 9943) return 'tourism';
        if (num >= 9908 && num <= 9937) return 'energy'; // Gas Utilities
        return 'other';
    }

    // DR / KY and others
    if (prefix === '91') return 'other';

    return 'other';
}

const stocks = JSON.parse(fs.readFileSync('./public/data/stocks.json', 'utf-8'));
const counts = {};
industries.forEach(ind => (counts[ind.id] = 0));

stocks.forEach(s => {
    const sector = getSectorBySymbol(s.symbol);
    counts[sector] = (counts[sector] || 0) + 1;
});

console.log('--- Industry Distribution Audit (FINAL) ---');
industries.forEach(ind => {
    console.log(`${ind.name.padEnd(10)} (${ind.id.padEnd(15)}): ${counts[ind.id]} stocks`);
});

const emptySectors = industries.filter(ind => counts[ind.id] === 0);
if (emptySectors.length > 0) {
    console.log('\nWarning: Empty Sectors found:', emptySectors.map(ind => ind.name).join(', '));
} else {
    console.log('\nSuccess: All sectors have stocks.');
}
