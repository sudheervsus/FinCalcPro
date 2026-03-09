const formatRupee = (num) => '₹' + Math.round(num).toLocaleString('en-IN');

let sipChartInstance = null;

// Initialize Chart.js
function initChart() {
    const ctx = document.getElementById('sipChart').getContext('2d');

    const data = {
        labels: [],
        datasets: [
            {
                label: 'Invested Amount',
                data: [],
                backgroundColor: '#94a3b8', // slate-400
                borderWidth: 0,
                borderRadius: 4
            },
            {
                label: 'Est. Returns',
                data: [],
                backgroundColor: '#10b981', // emerald-500
                borderWidth: 0,
                borderRadius: 4
            }
        ]
    };

    const config = {
        type: 'bar',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            scales: {
                x: {
                    stacked: true,
                    grid: { display: false }
                },
                y: {
                    stacked: true,
                    border: { display: false },
                    ticks: {
                        callback: function (value) {
                            if (value >= 10000000) return '₹' + (value / 10000000).toFixed(1) + 'Cr';
                            if (value >= 100000) return '₹' + (value / 100000).toFixed(1) + 'L';
                            if (value >= 1000) return '₹' + (value / 1000).toFixed(0) + 'K';
                            return '₹' + value;
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        padding: 20,
                        font: { family: 'Inter, system-ui, sans-serif', size: 13 }
                    }
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

    sipChartInstance = new Chart(ctx, config);
}

// Update the chart with new data
function updateChart(labels, principalData, returnsData) {
    if (sipChartInstance) {
        sipChartInstance.data.labels = labels;
        sipChartInstance.data.datasets[0].data = principalData;
        sipChartInstance.data.datasets[1].data = returnsData;
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

    const totalInvestedAmount = P * n;

    // Build timeline for chart
    let chartLabels = [];
    let principalData = [];
    let returnsData = [];

    let currentInvested = 0;
    for (let year = 1; year <= tYears; year++) {
        chartLabels.push('Year ' + year);

        const months = year * 12;
        const investedAtYear = P * months;
        let maturityAtYear = 0;
        if (i > 0) {
            maturityAtYear = P * ((Math.pow(1 + i, months) - 1) / i) * (1 + i);
        } else {
            maturityAtYear = investedAtYear;
        }

        principalData.push(investedAtYear);
        returnsData.push(maturityAtYear - investedAtYear);
    }

    // SIP Formula: M = P * ({[1 + i]^n - 1} / i) * (1 + i)
    let maturityAmount = 0;
    if (i > 0 && n > 0) {
        maturityAmount = P * ((Math.pow(1 + i, n) - 1) / i) * (1 + i);
    } else {
        maturityAmount = totalInvestedAmount;
    }

    const estReturns = maturityAmount - totalInvestedAmount;

    // Output to UI
    document.getElementById('investedAmountDisplay').textContent = formatRupee(totalInvestedAmount);
    document.getElementById('estReturnsDisplay').textContent = formatRupee(estReturns);
    document.getElementById('totalValueDisplay').textContent = formatRupee(maturityAmount);

    updateChart(chartLabels, principalData, returnsData);
}

// On DOM ready
document.addEventListener('DOMContentLoaded', () => {
    initChart();
    calculateSIP();
});
