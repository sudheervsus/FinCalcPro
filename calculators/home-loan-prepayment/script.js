const formatRupee = (num) => '₹' + Math.round(num).toLocaleString('en-IN');

let prepaymentChartInstance = null;

// Initialize Chart.js
function initChart() {
    const ctx = document.getElementById('prepaymentChart').getContext('2d');

    const data = {
        labels: ['Original Loan', 'Revised Loan'],
        datasets: [
            {
                label: 'Total Interest',
                data: [50, 40],
                backgroundColor: '#ef4444', // red-500
                borderWidth: 0,
                borderRadius: { topLeft: 4, topRight: 4, bottomLeft: 0, bottomRight: 0 }
            },
            {
                label: 'Principal Loan',
                data: [100, 100],
                backgroundColor: '#94a3b8', // slate-400
                borderWidth: 0,
                borderRadius: { topLeft: 0, topRight: 0, bottomLeft: 4, bottomRight: 4 }
            }
        ]
    };

    const config = {
        type: 'bar',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    stacked: true,
                    grid: { display: false }
                },
                y: {
                    stacked: true,
                    ticks: {
                        callback: function (value) {
                            if (value >= 10000000) return '₹' + (value / 10000000).toFixed(1) + 'Cr';
                            if (value >= 100000) return '₹' + (value / 100000).toFixed(1) + 'L';
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
                        padding: 20
                    }
                },
                tooltip: {
                    colors: {
                        backgroundColor: '#1e293b'
                    },
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

    prepaymentChartInstance = new Chart(ctx, config);
}

// Update the chart with new data
function updateChart(principal, originalInterest, revisedInterest) {
    if (prepaymentChartInstance) {
        prepaymentChartInstance.data.datasets[0].data = [originalInterest, revisedInterest];
        prepaymentChartInstance.data.datasets[1].data = [principal, principal];
        prepaymentChartInstance.update();
    }
}

// Sync between Input and Slider
function syncInput(id) {
    const sliderValue = document.getElementById(id + 'Slider').value;
    document.getElementById(id + 'Input').value = sliderValue;
    calculatePrepayment();
}

function syncSlider(id) {
    let inputValue = parseFloat(document.getElementById(id + 'Input').value);

    // Limits
    if (id === 'principal') {
        if (inputValue < 100000) inputValue = 100000;
        if (inputValue > 500000000) inputValue = 500000000;
    } else if (id === 'rate') {
        if (inputValue < 1) inputValue = 1;
        if (inputValue > 30) inputValue = 30;
    } else if (id === 'tenure') {
        if (inputValue < 1) inputValue = 1;
        if (inputValue > 40) inputValue = 40;
    } else if (id === 'lump') {
        if (inputValue < 0) inputValue = 0;
        if (inputValue > document.getElementById('principalInput').value) inputValue = document.getElementById('principalInput').value;
    } else if (id === 'extraMonthly') {
        if (inputValue < 0) inputValue = 0;
    }

    if (document.getElementById(id + 'Slider')) {
        document.getElementById(id + 'Slider').value = inputValue;
    }
    calculatePrepayment();
}

function formatMonthsToYears(months) {
    const y = Math.floor(months / 12);
    const m = months % 12;
    if (y > 0 && m > 0) return `${y} Years ${m} Months`;
    if (y > 0) return `${y} Years`;
    return `${m} Months`;
}

function calculatePrepayment() {
    const P = parseFloat(document.getElementById('principalInput').value) || 0;
    const rAnnual = parseFloat(document.getElementById('rateInput').value) || 0;
    const tYears = parseFloat(document.getElementById('tenureInput').value) || 0;

    let lump = parseFloat(document.getElementById('lumpInput').value) || 0;
    const extraMonthly = parseFloat(document.getElementById('extraMonthlyInput').value) || 0;

    // Safety: Cannot prepay more than the outstanding principal
    if (lump > P) lump = P;

    const r = (rAnnual / 100) / 12;
    const n = Math.floor(tYears * 12);

    if (P <= 0 || r <= 0 || n <= 0) return;

    // 1. Original Scenario
    const emi = P * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
    const originalInterest = (emi * n) - P;

    document.getElementById('baseEmiDisplay').textContent = formatRupee(emi);
    document.getElementById('originalInterestDisplay').textContent = formatRupee(originalInterest);
    document.getElementById('originalMonthsDisplay').textContent = n;

    // 2. Revised Scenario
    let balance = P - lump;
    let revisedInterest = 0;
    let revisedN = 0;

    // Amortization loop
    for (let i = 1; i <= n * 2; i++) { // safety limit
        if (balance <= 0) break;

        let interestForMonth = balance * r;
        let expectedTotalPayment = emi + extraMonthly;

        if (balance + interestForMonth <= expectedTotalPayment) {
            // Final month
            revisedInterest += interestForMonth;
            balance = 0;
            revisedN = i;
            break;
        } else {
            revisedInterest += interestForMonth;
            let principalForMonth = expectedTotalPayment - interestForMonth;
            balance -= principalForMonth;
            revisedN = i;
        }
    }

    // Safety checks for UI displaying negatives
    let interestSaved = originalInterest - revisedInterest;
    let monthsSaved = n - revisedN;
    if (interestSaved < 0) interestSaved = 0;
    if (monthsSaved < 0) monthsSaved = 0;

    // Output to UI
    document.getElementById('revisedInterestDisplay').textContent = formatRupee(revisedInterest);
    document.getElementById('revisedMonthsDisplay').textContent = revisedN;

    document.getElementById('interestSavedDisplay').textContent = formatRupee(interestSaved);
    document.getElementById('tenureSavedDisplay').textContent = formatMonthsToYears(monthsSaved);

    updateChart(P, originalInterest, revisedInterest);
}

// Ensure Lumpsum slider max updates if Principal changes
document.getElementById('principalInput').addEventListener('input', function () {
    document.getElementById('lumpSlider').max = this.value;
});
document.getElementById('principalSlider').addEventListener('input', function () {
    document.getElementById('lumpSlider').max = this.value;
});

// On DOM ready
document.addEventListener('DOMContentLoaded', () => {
    initChart();
    calculatePrepayment();
});
