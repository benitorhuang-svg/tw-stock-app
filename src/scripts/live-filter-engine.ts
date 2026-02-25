/**
 * Core engine for LiveFilterPanel.astro
 */
function setupFilterUI() {
    const trendInput = document.getElementById('filter-trend') as HTMLInputElement;
    const trendDisplay = document.getElementById('trend-display');
    const trendUp = document.getElementById('trend-up');
    const trendDn = document.getElementById('trend-dn');

    const volInput = document.getElementById('filter-volume') as HTMLInputElement;
    const volDisplay = document.getElementById('vol-display');
    const volUp = document.getElementById('vol-up');
    const volDn = document.getElementById('vol-dn');

    const starredCheck = document.getElementById('filter-starred') as HTMLInputElement;
    const starIcon = document.querySelector('.star-toggle-icon');

    const updateTrend = () => {
        if (!trendInput || !trendDisplay) return;
        const val = parseFloat(trendInput.value);
        const prefix = val > 0 ? '+' : '';
        trendDisplay.textContent = prefix + val.toFixed(1) + '%';

        if (val > 0) {
            trendDisplay.classList.remove('text-accent', 'text-bearish');
            trendDisplay.classList.add('text-bullish');
        } else if (val < 0) {
            trendDisplay.classList.remove('text-accent', 'text-bullish');
            trendDisplay.classList.add('text-bearish');
        } else {
            trendDisplay.classList.remove('text-bullish', 'text-bearish');
            trendDisplay.classList.add('text-accent');
        }
    };

    const updateVol = () => {
        if (!volInput || !volDisplay) return;
        const val = parseInt(volInput.value);
        volDisplay.textContent = val >= 10000 ? (val / 10000).toFixed(1) + '萬' : val.toString();
    };

    // Trend Buttons
    if (trendUp && trendInput) {
        trendUp.addEventListener('click', () => {
            trendInput.value = String(Math.min(10, parseFloat(trendInput.value) + 0.5));
            updateTrend();
            trendInput.dispatchEvent(new Event('input'));
        });
    }
    if (trendDn && trendInput) {
        trendDn.addEventListener('click', () => {
            trendInput.value = String(Math.max(-10, parseFloat(trendInput.value) - 0.5));
            updateTrend();
            trendInput.dispatchEvent(new Event('input'));
        });
    }
    if (trendInput) {
        trendInput.addEventListener('input', updateTrend);
    }

    // Volume Buttons
    if (volUp && volInput) {
        volUp.addEventListener('click', () => {
            volInput.value = String(Math.min(1000000, parseInt(volInput.value) + 5000));
            updateVol();
            volInput.dispatchEvent(new Event('input'));
        });
    }
    if (volDn && volInput) {
        volDn.addEventListener('click', () => {
            volInput.value = String(Math.max(0, parseInt(volInput.value) - 5000));
            updateVol();
            volInput.dispatchEvent(new Event('input'));
        });
    }
    if (volInput) {
        volInput.addEventListener('input', updateVol);
    }

    if (starredCheck && starIcon) {
        starredCheck.addEventListener('change', () => {
            starIcon.textContent = starredCheck.checked ? '★' : '☆';
        });
    }
}

document.addEventListener('astro:page-load', setupFilterUI);
