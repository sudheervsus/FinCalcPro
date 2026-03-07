const formatRupee = (num) => '₹' + Math.round(num).toLocaleString('en-IN');

let sipChartInstance = null;

// Initialize Chart.js
function initChart() {
    const ctx = document.getElementById('sipChart').getContext('2d');

    // Default data before calculation
    const data = {
        labels: ['Invested Amount', 'Est. Returns'],
        datasets: [{
            data: [50, 50],
            backgroundColor: ['#94a3b8', '#10b981'], // slate-400 and emerald-500
            hoverBackgroundColor: ['#64748b', '#059669'],
            borderWidth: 0,
            hoverOffset: 4
        }]
    };

    const config = {
        type: 'doughnut',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '75%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        padding: 20,
                        font: {
                            family: 'Inter, system-ui, sans-serif',
                            size: 13
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            let label = context.label || '';
                            if (label) label += ': ';
                            label += formatRupee(context.raw);
                            return label;
                        }
                    }
                }
            }
        }
    };

    sipChartInstance = new Chart(ctx, config);
}

// Update the chart with new data
function updateChart(invested, returns) {
    if (sipChartInstance) {
        sipChartInstance.data.datasets[0].data = [invested, returns];
        sipChartInstance.update();
    }
}

// Sync between Input and Slider
function syncInput(id) {
    const sliderValue = document.getElementById(id + 'Slider').value;
    document.getElementById(id + 'Input').value = sliderValue;
    calculateSIP();
}

function syncSlider(id) {
    let inputValue = parseFloat(document.getElementById(id + 'Input').value);

    // Limits
    if (id === 'monthly') {
        if (inputValue < 500) inputValue = 500;
        if (inputValue > 1000000) inputValue = 1000000; // allow large manual override
    } else if (id === 'rate') {
        if (inputValue < 1) inputValue = 1;
        if (inputValue > 50) inputValue = 50;
    } else if (id === 'time') {
        if (inputValue < 1) inputValue = 1;
        if (inputValue > 50) inputValue = 50;
    }

    document.getElementById(id + 'Slider').value = inputValue;
    calculateSIP();
}

// Core Math Function
function calculateSIP() {
    const P = parseFloat(document.getElementById('monthlyInput').value) || 0;
    const rAnnual = parseFloat(document.getElementById('rateInput').value) || 0;
    const tYears = parseFloat(document.getElementById('timeInput').value) || 0;

    const n = Math.floor(tYears * 12);
    const i = (rAnnual / 100) / 12;

    const investedAmount = P * n;

    // SIP Formula: M = P * ({[1 + i]^n - 1} / i) * (1 + i)
    let maturityAmount = 0;
    if (i > 0) {
        maturityAmount = P * ((Math.pow(1 + i, n) - 1) / i) * (1 + i);
    } else {
        maturityAmount = investedAmount;
    }

    const estReturns = maturityAmount - investedAmount;

    // Output to UI
    document.getElementById('investedAmountDisplay').textContent = formatRupee(investedAmount);
    document.getElementById('estReturnsDisplay').textContent = formatRupee(estReturns);
    document.getElementById('totalValueDisplay').textContent = formatRupee(maturityAmount);

    updateChart(investedAmount, estReturns);
}

// On DOM ready
document.addEventListener('DOMContentLoaded', () => {
    initChart();
    calculateSIP();
});
