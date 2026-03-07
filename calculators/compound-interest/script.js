const formatRupee = (num) => '₹' + Math.round(num).toLocaleString('en-IN');

let compChartInstance = null;

function initChart() {
    if (typeof document !== 'undefined' && document.getElementById('compChart')) {
        const ctx = document.getElementById('compChart').getContext('2d');
        const data = {
            labels: ['Principal Invested', 'Est. Returns'],
            datasets: [{
                data: [50, 50],
                backgroundColor: ['#94a3b8', '#10b981'], // slate-400, emerald-500
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
                            font: { family: 'Inter, system-ui, sans-serif', size: 13 }
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

        compChartInstance = new Chart(ctx, config);
    }
}

function updateChart(principalAmount, returnsAmount) {
    if (compChartInstance) {
        compChartInstance.data.datasets[0].data = [principalAmount, returnsAmount];
        compChartInstance.update();
    }
}

function syncInput(id) {
    let val = document.getElementById(id + 'Slider').value;
    document.getElementById(id + 'Input').value = val;
    calculate();
}

function syncSlider(id) {
    let val = parseFloat(document.getElementById(id + 'Input').value);

    // Apply strict boundaries for sliders based on min/max in HTML
    if (id === 'principal') {
        if (val < 5000) val = 5000;
        if (val > 100000000) val = 100000000; // allow bigger manual input
    } else if (id === 'rate') {
        if (val < 1) val = 1;
        if (val > 100) val = 100;
    } else if (id === 'time') {
        if (val < 1) val = 1;
        if (val > 100) val = 100;
    }

    if (document.getElementById(id + 'Slider')) {
        document.getElementById(id + 'Slider').value = val;
    }
    calculate();
}

function calculate() {
    const p = parseFloat(document.getElementById('principalInput').value) || 0;
    const rateAnnual = parseFloat(document.getElementById('rateInput').value) || 0;
    const tYears = parseFloat(document.getElementById('timeInput').value) || 0;
    const n = parseInt(document.getElementById('frequencySelect').value) || 1;

    // Compound Interest Formula: A = P(1 + r/n)^(nt)
    const r = rateAnnual / 100;
    const exponent = n * tYears;

    let maturityAmount = 0;
    if (n > 0 && tYears > 0) {
        maturityAmount = p * Math.pow(1 + (r / n), exponent);
    } else {
        maturityAmount = p; // fallback
    }

    const estReturns = maturityAmount - p;

    // Output to UI
    document.getElementById('investedAmountDisplay').textContent = formatRupee(p);
    document.getElementById('estReturnsDisplay').textContent = formatRupee(estReturns);
    document.getElementById('totalValueDisplay').textContent = formatRupee(maturityAmount);

    updateChart(p, estReturns);
}

document.addEventListener('DOMContentLoaded', () => {
    initChart();

    // Set default frequency to Annually
    const freqSelect = document.getElementById('frequencySelect');
    if (freqSelect) freqSelect.value = "1";

    calculate();
});
