const formatRupee = (num) => '₹' + Math.round(num).toLocaleString('en-IN');

let rentBuyChartInstance = null;

// Initialize Chart.js
function initChart() {
    const ctx = document.getElementById('rentBuyChart').getContext('2d');

    const data = {
        labels: ['Net Worth if Buying', 'Net Worth if Renting'],
        datasets: [{
            data: [50, 50],
            backgroundColor: ['#10b981', '#6366f1'], // emerald-500 and indigo-500
            hoverBackgroundColor: ['#059669', '#4f46e5'],
            borderWidth: 0,
            borderRadius: 4
        }]
    };

    const config = {
        type: 'bar',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function (value) {
                            if (value >= 10000000) return '₹' + (value / 10000000).toFixed(1) + 'Cr';
                            if (value >= 100000) return '₹' + (value / 100000).toFixed(1) + 'L';
                            return '₹' + value;
                        }
                    }
                },
                x: {
                    grid: { display: false }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            let label = context.dataset.label || '';
                            if (label) label += ': ';
                            label += formatRupee(context.raw);
                            return label;
                        }
                    }
                }
            }
        }
    };

    rentBuyChartInstance = new Chart(ctx, config);
}

// Update the chart with new data
function updateChart(buyNetWorth, rentNetWorth) {
    if (rentBuyChartInstance) {
        // Protect against negative net worth in bar charts looking weird, though mathematically possible
        const buyPlot = Math.max(0, buyNetWorth);
        const rentPlot = Math.max(0, rentNetWorth);
        rentBuyChartInstance.data.datasets[0].data = [buyPlot, rentPlot];
        rentBuyChartInstance.update();
    }
}

// Sync between Input and Slider
function syncInput(id) {
    const sliderValue = document.getElementById(id + 'Slider').value;
    document.getElementById(id + 'Input').value = sliderValue;
    calculateRentVsBuy();
}

function syncSlider(id) {
    let inputValue = parseFloat(document.getElementById(id + 'Input').value);

    // Limits
    if (id === 'prop' || id === 'rent') {
        if (inputValue < 0) inputValue = 0;
    } else if (id === 'down') {
        if (inputValue < 0) inputValue = 0;
        if (inputValue > 100) inputValue = 100;
    } else if (id === 'loanRate' || id === 'appr' || id === 'rentInc' || id === 'invst') {
        if (inputValue < -100) inputValue = -100;
        if (inputValue > 100) inputValue = 100;
    } else if (id === 'tenure') {
        if (inputValue < 1) inputValue = 1;
        if (inputValue > 50) inputValue = 50;
    }

    if (document.getElementById(id + 'Slider')) {
        document.getElementById(id + 'Slider').value = inputValue;
    }
    calculateRentVsBuy();
}

// Core Math Function
function calculateRentVsBuy() {
    const P = parseFloat(document.getElementById('propInput').value) || 0;
    const downPercent = parseFloat(document.getElementById('downInput').value) || 0;
    const loanRate = parseFloat(document.getElementById('loanRateInput').value) || 0;
    const apprRate = parseFloat(document.getElementById('apprInput').value) || 0;
    const tenureYears = parseFloat(document.getElementById('tenureInput').value) || 0;

    const initialRent = parseFloat(document.getElementById('rentInput').value) || 0;
    const rentIncRate = parseFloat(document.getElementById('rentIncInput').value) || 0;
    const invstRate = parseFloat(document.getElementById('invstInput').value) || 0;

    const n = Math.floor(tenureYears * 12);

    // --- BUYING MATH ---
    // At the end of tenure, loan is completely paid off, so outstanding = 0.
    // Net Worth = Appreciated Property Value
    const downPayment = P * (downPercent / 100);
    const loanAmount = P - downPayment;

    const rMonthly = (loanRate / 100) / 12;
    let emi = 0;
    if (rMonthly > 0) {
        emi = loanAmount * rMonthly * Math.pow(1 + rMonthly, n) / (Math.pow(1 + rMonthly, n) - 1);
    } else if (n > 0) {
        emi = loanAmount / n;
    }

    const buyNetWorth = P * Math.pow(1 + (apprRate / 100), tenureYears);

    // --- RENTING MATH ---
    // You don't pay downpayment, you invest it.
    // Every month, your out-of-pocket budget is assumed to be equal to the EMI.
    // If EMI > Rent, you invest the difference.
    // If Rent > EMI, you withdraw the difference from your portfolio.

    const invstMonthlyRate = (invstRate / 100) / 12;
    let rentInvestmentPortfolio = downPayment;
    let currentMonthlyRent = initialRent;

    for (let month = 1; month <= n; month++) {
        // Increase rent by Annual Rent Increase % every 12 months (starting month 13)
        if (month > 1 && (month - 1) % 12 === 0) {
            currentMonthlyRent *= (1 + (rentIncRate / 100));
        }

        const monthlySavings = emi - currentMonthlyRent;

        // Compound portfolio
        rentInvestmentPortfolio *= (1 + invstMonthlyRate);
        // Add/Subtract monthly savings
        rentInvestmentPortfolio += monthlySavings;
    }

    const rentNetWorth = rentInvestmentPortfolio;

    // --- Output to UI ---
    document.getElementById('buyNetWorthDisplay').textContent = formatRupee(buyNetWorth);
    document.getElementById('rentNetWorthDisplay').textContent = formatRupee(rentNetWorth);
    document.getElementById('summaryTenure').textContent = tenureYears + ' Years';

    const winnerBadge = document.getElementById('winnerBadge');
    const winnerDifference = document.getElementById('winnerDifference');

    if (buyNetWorth > rentNetWorth) {
        winnerBadge.textContent = 'Buying a Home';
        winnerBadge.className = 'bg-emerald-500 text-white font-extrabold text-2xl px-6 py-2 rounded-full mb-3 uppercase tracking-wider shadow-lg';
        winnerDifference.textContent = formatRupee(buyNetWorth - rentNetWorth);
    } else if (rentNetWorth > buyNetWorth) {
        winnerBadge.textContent = 'Renting';
        winnerBadge.className = 'bg-indigo-500 text-white font-extrabold text-2xl px-6 py-2 rounded-full mb-3 uppercase tracking-wider shadow-lg';
        winnerDifference.textContent = formatRupee(rentNetWorth - buyNetWorth);
    } else {
        winnerBadge.textContent = 'Tie';
        winnerBadge.className = 'bg-slate-500 text-white font-extrabold text-2xl px-6 py-2 rounded-full mb-3 uppercase tracking-wider shadow-lg';
        winnerDifference.textContent = '₹0';
    }

    updateChart(buyNetWorth, rentNetWorth);
}

// On DOM ready
document.addEventListener('DOMContentLoaded', () => {
    initChart();
    calculateRentVsBuy();
});
