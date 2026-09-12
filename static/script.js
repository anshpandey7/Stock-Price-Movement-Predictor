let chartInstance = null;

const loadingTexts = [
    "Fetching market data...",
    "Extracting technical indicators...",
    "Training Random Forest...",
    "Calculating predictions..."
];
let textInterval;

// Landing Page Logic
const landingForm = document.getElementById('landing-predict-form');
if (landingForm) {
    landingForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const ticker = document.getElementById('landing-ticker-input').value.trim().toUpperCase();
        if (ticker) {
            window.location.href = `/stock/${ticker}`;
        }
    });
}

const mirrorList = document.getElementById('mirror-stocks-list');
if (mirrorList) {
    document.addEventListener('DOMContentLoaded', fetchTopStocks);
}

async function fetchTopStocks() {
    try {
        const response = await fetch('/top_stocks');
        if (!response.ok) throw new Error('Failed to fetch top stocks');
        
        const stocks = await response.json();
        
        mirrorList.innerHTML = ''; // clear
        
        stocks.forEach(stock => {
            const li = document.createElement('li');
            li.className = 'mirror-item';
            li.innerHTML = `
                <div class="mirror-name">${stock.ticker}</div>
                <div class="mirror-data">
                    <div class="mirror-price">${stock.price}</div>
                    <div class="mirror-change ${stock.isUp ? 'change-up' : 'change-down'}">
                        ${stock.change}
                    </div>
                </div>
            `;
            
            // Redirect to stock details page on click
            li.addEventListener('click', () => {
                window.location.href = `/stock/${stock.ticker}`;
            });
            
            mirrorList.appendChild(li);
        });
        
        document.getElementById('mirror-loading').classList.add('hidden');
        mirrorList.classList.remove('hidden');
        
    } catch (err) {
        console.error("Error loading top stocks:", err);
        document.getElementById('mirror-loading').innerHTML = '<p style="color:red">Failed to load markets.</p>';
    }
}


// Stock Details Page Logic
if (typeof CURRENT_TICKER !== 'undefined' && CURRENT_TICKER) {
    document.addEventListener('DOMContentLoaded', () => {
        fetchPrediction(CURRENT_TICKER);
    });
}

async function fetchPrediction(ticker) {
    const loadingDiv = document.getElementById('loading');
    const dashboardDiv = document.getElementById('dashboard');
    const errorDiv = document.getElementById('error-message');
    const loadingText = document.getElementById('loading-text');
    
    loadingDiv.classList.remove('hidden');
    dashboardDiv.classList.add('hidden');
    errorDiv.classList.add('hidden');
    
    let textIdx = 0;
    loadingText.textContent = loadingTexts[0];
    textInterval = setInterval(() => {
        textIdx = (textIdx + 1) % loadingTexts.length;
        loadingText.textContent = loadingTexts[textIdx];
    }, 1200);

    try {
        const response = await fetch('/predict', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ticker: ticker })
        });
        
        const data = await response.json();
        
        clearInterval(textInterval);
        
        if (!response.ok) {
            throw new Error(data.error || 'Something went wrong');
        }
        
        // Populate Chart Panel Info
        document.getElementById('res-ticker').textContent = data.ticker;
        document.getElementById('res-price').textContent = '$' + data.currentPrice;
        
        // Populate New Company Info
        const companyEl = document.getElementById('res-company');
        if (companyEl && data.company) {
            companyEl.textContent = data.company.name;
        }
        
        const summaryEl = document.getElementById('res-summary');
        if (summaryEl && data.company) {
            summaryEl.textContent = data.company.summary;
        }
        
        const sectorEl = document.getElementById('res-sector');
        if (sectorEl && data.company) {
            sectorEl.textContent = data.company.sector;
        }
        
        // Populate Fundamentals
        const mcapEl = document.getElementById('res-mcap');
        if (mcapEl && data.company) mcapEl.textContent = data.company.marketCap;
        
        const peEl = document.getElementById('res-pe');
        if (peEl && data.company) peEl.textContent = data.company.peRatio;
        
        const highEl = document.getElementById('res-high52');
        if (highEl && data.company) highEl.textContent = data.company.high52w;
        
        const lowEl = document.getElementById('res-low52');
        if (lowEl && data.company) lowEl.textContent = data.company.low52w;
        
        const returnEl = document.getElementById('res-return');
        returnEl.textContent = data.todayReturn;
        if (parseFloat(data.todayReturn) >= 0) {
            returnEl.className = 'return-positive';
        } else {
            returnEl.className = 'return-negative';
        }
        
        // Populate Prediction Card
        const predText = document.getElementById('res-prediction');
        const predWrapper = document.getElementById('res-prediction-wrapper');
        const predIcon = document.getElementById('pred-icon');
        
        predText.textContent = data.prediction;
        if (data.prediction === 'Up') {
            predWrapper.className = 'prediction-large up';
            predIcon.innerHTML = '<path d="M12 19V5M5 12l7-7 7 7"/>';
        } else {
            predWrapper.className = 'prediction-large down';
            predIcon.innerHTML = '<path d="M12 5v14M19 12l-7 7-7-7"/>';
        }
        
        const accNum = data.accuracy.replace('%','');
        document.getElementById('res-accuracy').textContent = data.accuracy;
        document.getElementById('conf-fill').style.width = data.accuracy;
        
        // Populate Indicators Card
        document.getElementById('res-rsi').textContent = data.indicators.rsi;
        document.getElementById('res-sma20').textContent = data.indicators.sma20;
        
        const macdEl = document.getElementById('res-macd');
        macdEl.textContent = data.indicators.macd;
        macdEl.className = 'ind-value ' + (data.indicators.macd === 'Bullish' ? 'bull' : 'bear');
        
        // Extra info
        const volEl = document.getElementById('res-volume');
        if (volEl) volEl.textContent = data.todayVolume;

        // Render Chart
        renderChart(data.chartData);
        
        // UI State: Show Dashboard
        loadingDiv.classList.add('hidden');
        dashboardDiv.classList.remove('hidden');
        
    } catch (err) {
        clearInterval(textInterval);
        loadingDiv.classList.add('hidden');
        errorDiv.classList.remove('hidden');
        document.getElementById('error-text').textContent = err.message;
    }
}

function renderChart(chartData) {
    const ctx = document.getElementById('stockChart').getContext('2d');
    
    if (chartInstance) {
        chartInstance.destroy();
    }
    
    Chart.defaults.color = '#8C9BAB';
    Chart.defaults.font.family = "'Inter', sans-serif";
    
    // Create gradient
    let gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(0, 208, 132, 0.6)');
    gradient.addColorStop(1, 'rgba(0, 208, 132, 0.0)');
    
    // Progressive line animation
    const totalDuration = 1000; // Faster animation
    const delayBetweenPoints = totalDuration / chartData.close.length;
    const previousY = (ctx) => ctx.index === 0 ? ctx.chart.scales.y.getPixelForValue(100) : ctx.chart.getDatasetMeta(ctx.datasetIndex).data[ctx.index - 1].getProps(['y'], true).y;
    
    const animation = {
      x: {
        type: 'number',
        easing: 'linear',
        duration: delayBetweenPoints,
        from: NaN, 
        delay(ctx) {
          if (ctx.type !== 'data' || ctx.xStarted) return 0;
          ctx.xStarted = true;
          return ctx.index * delayBetweenPoints;
        }
      },
      y: {
        type: 'number',
        easing: 'linear',
        duration: delayBetweenPoints,
        from: previousY,
        delay(ctx) {
          if (ctx.type !== 'data' || ctx.yStarted) return 0;
          ctx.yStarted = true;
          return ctx.index * delayBetweenPoints;
        }
      }
    };
    
    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartData.dates,
            datasets: [
                {
                    label: 'Close',
                    data: chartData.close,
                    borderColor: '#00D084',
                    backgroundColor: gradient,
                    borderWidth: 3,
                    pointRadius: 0,
                    pointHitRadius: 20,
                    tension: 0.1,
                    fill: true
                }
            ]
        },
        options: {
            animation: animation,
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(17, 21, 28, 0.9)',
                    titleColor: '#fff',
                    bodyColor: '#00D084',
                    bodyFont: { size: 14, weight: 'bold' },
                    borderColor: 'rgba(0, 208, 132, 0.3)',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            return '$' + context.parsed.y.toFixed(2);
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { maxTicksLimit: 6 }
                },
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.03)', drawBorder: false },
                    position: 'right'
                }
            }
        }
    });
}


// Chart Tabs Logic
document.addEventListener('DOMContentLoaded', () => {
    const tabs = document.querySelectorAll('.chart-tabs span');
    tabs.forEach(tab => {
        tab.addEventListener('click', async (e) => {
            // Update active state
            tabs.forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            
            const period = e.target.textContent.toLowerCase();
            if (typeof CURRENT_TICKER !== 'undefined' && CURRENT_TICKER) {
                try {
                    const response = await fetch('/chart_data?ticker=' + CURRENT_TICKER + '&period=' + period);
                    if (!response.ok) throw new Error('Failed to fetch chart data');
                    const newData = await response.json();
                    renderChart(newData);
                } catch (err) {
                    console.error('Error loading chart data:', err);
                }
            }
        });
    });
});

