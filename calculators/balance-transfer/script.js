const formatRupee = (num) => '₹' + Math.round(num).toLocaleString('en-IN');

let comparisonChartInstance = null;

function initChart() {
    if (typeof document !== 'undefined' && document.getElementById('comparisonChart')) {
        const ctx = document.getElementById('comparisonChart').getContext('2d');
        const data = {
            labels: ['Current Interest', 'New Interest'],
            datasets: [{
                label: 'Total Interest Payable',
                data: [1000, 1000], // default
                backgroundColor: ['#94a3b8', '#059669'], // slate-400, emerald-600
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
                                return '₹' + (value / 1000) + 'k';
                            }
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                return formatRupee(context.raw);
                            }
                        }
                    }
                }
            }
        };

        comparisonChartInstance = new Chart(ctx, config);
    }
}

function updateChart(oldInterest, newInterest) {
    if (comparisonChartInstance) {
        comparisonChartInstance.data.datasets[0].data = [oldInterest, newInterest];
        comparisonChartInstance.update();
    }
}

function syncInput(id) {
    const sliderVal = document.getElementById(id + 'Slider').value;
    document.getElementById(id + 'Input').value = sliderVal;
    calculateTransfer();
}

function syncSlider(id) {
    let inputVal = parseFloat(document.getElementById(id + 'Input').value);

    // Apply strict boundaries for sliders based on min/max in HTML
    if (id === 'principal') {
        if (inputVal < 100000) inputVal = 100000;
        if (inputVal > 50000000) inputVal = 50000000;
    } else if (id === 'oldRate' || id === 'newRate') {
        if (inputVal < 1) inputVal = 1;
        if (inputVal > 30) inputVal = 30;
    } else if (id === 'tenure') {
        if (inputVal < 1) inputVal = 1;
        if (inputVal > 360) inputVal = 360;
    }

    if (document.getElementById(id + 'Slider')) {
        document.getElementById(id + 'Slider').value = inputVal;
    }
    calculateTransfer();
}

function calcEMI(principal, annualRate, tenureMonths) {
    if (principal <= 0 || annualRate <= 0 || tenureMonths <= 0) return 0;
    const r = (annualRate / 100) / 12;
    return principal * r * Math.pow(1 + r, tenureMonths) / (Math.pow(1 + r, tenureMonths) - 1);
}

function calculateTransfer() {
    const p = parseFloat(document.getElementById('principalInput').value) || 0;
    const oldRate = parseFloat(document.getElementById('oldRateInput').value) || 0;
    const newRate = parseFloat(document.getElementById('newRateInput').value) || 0;
    const tenureMonths = parseInt(document.getElementById('tenureInput').value) || 0;
    const fee = parseFloat(document.getElementById('feeInput').value) || 0;

    // Current Loan
    const oldEmi = calcEMI(p, oldRate, tenureMonths);
    const oldTotalInterest = (oldEmi * tenureMonths) - p;

    // New Loan
    const newEmi = calcEMI(p, newRate, tenureMonths);
    const newTotalInterest = (newEmi * tenureMonths) - p;

    // Calculate Net Savings
    const netSavings = (oldTotalInterest - newTotalInterest) - fee;

    // Outputs
    document.getElementById('oldEmiDisplay').textContent = formatRupee(oldEmi > 0 ? oldEmi : 0);
    document.getElementById('newEmiDisplay').textContent = formatRupee(newEmi > 0 ? newEmi : 0);
    document.getElementById('oldInterestDisplay').textContent = formatRupee(oldTotalInterest > 0 ? oldTotalInterest : 0);
    document.getElementById('newInterestDisplay').textContent = formatRupee(newTotalInterest > 0 ? newTotalInterest : 0);

    const savingsHero = document.getElementById('savingsHero');
    const netDisplay = document.getElementById('netSavingsDisplay');

    if (netSavings > 0) {
        netDisplay.textContent = formatRupee(netSavings);
        netDisplay.classList.remove('text-rose-400');
        netDisplay.classList.add('text-emerald-400');
    } else {
        netDisplay.textContent = formatRupee(netSavings); // will show negative
        netDisplay.classList.remove('text-emerald-400');
        netDisplay.classList.add('text-rose-400');
    }

    updateChart(oldTotalInterest > 0 ? oldTotalInterest : 0, newTotalInterest > 0 ? newTotalInterest : 0);
}

document.addEventListener('DOMContentLoaded', () => {
    initChart();
    calculateTransfer();
});
