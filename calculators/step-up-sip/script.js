const formatRupee = (num) => '₹' + Math.round(num).toLocaleString('en-IN');

let sipChartInstance = null;

function initChart() {
    if (typeof document !== 'undefined' && document.getElementById('sipChart')) {
        const ctx = document.getElementById('sipChart').getContext('2d');
        const data = {
            labels: ['Total Invested', 'Est. Returns'],
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
                cutout: '70%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            padding: 15,
                            font: { family: 'Inter, system-ui, sans-serif', size: 12 }
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
}

function updateChart(invested, iterest) {
    if (sipChartInstance) {
        sipChartInstance.data.datasets[0].data = [invested, iterest];
        sipChartInstance.update();
    }
}

function syncInput(id) {
    let val = document.getElementById(id + 'Slider').value;
    document.getElementById(id + 'Input').value = val;
    calculate();
}

function syncSlider(id) {
    let val = parseFloat(document.getElementById(id + 'Input').value);

    // boundaries
    if (id === 'monthly') {
        if (val < 500) val = 500; if (val > 100000000) val = 100000000;
    } else if (id === 'step') {
        if (val < 0) val = 0; if (val > 100) val = 100;
    } else if (id === 'rate') {
        if (val < 1) val = 1; if (val > 50) val = 50;
    } else if (id === 'time') {
        if (val < 1) val = 1; if (val > 100) val = 100;
    }

    if (document.getElementById(id + 'Slider')) {
        document.getElementById(id + 'Slider').value = val;
    }
    calculate();
}

function calculate() {
    const initialSip = parseFloat(document.getElementById('monthlyInput').value) || 0;
    const stepPct = parseFloat(document.getElementById('stepInput').value) || 0;
    const annualRate = parseFloat(document.getElementById('rateInput').value) || 0;
    const years = parseInt(document.getElementById('timeInput').value) || 0;

    let balance = 0;
    let totalInvested = 0;
    let currentSip = initialSip;
    const monthlyRate = (annualRate / 100) / 12;

    for (let y = 1; y <= years; y++) {
        for (let m = 1; m <= 12; m++) {
            totalInvested += currentSip;
            // Assuming deposit at the start of the month for compounding
            balance = (balance + currentSip) * (1 + monthlyRate);
        }
        // At the end of the year, step up the SIP
        currentSip = currentSip * (1 + (stepPct / 100));
    }

    const estReturns = Math.max(0, balance - totalInvested);

    document.getElementById('investedDisplay').textContent = formatRupee(totalInvested);
    document.getElementById('returnsDisplay').textContent = formatRupee(estReturns);
    document.getElementById('totalValueDisplay').textContent = formatRupee(balance);

    updateChart(totalInvested, estReturns);
}

document.addEventListener('DOMContentLoaded', () => {
    initChart();
    calculate();
});
