const formatRupee = (num) => '₹' + Math.round(num).toLocaleString('en-IN');

let ppfChartInstance = null;

function initChart() {
    if (typeof document !== 'undefined' && document.getElementById('ppfChart')) {
        const ctx = document.getElementById('ppfChart').getContext('2d');
        const data = {
            labels: ['Total Invested', 'Total Interest Gained'],
            datasets: [{
                data: [50, 50],
                backgroundColor: ['#94a3b8', '#0d9488'], // slate-400, teal-600
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

        ppfChartInstance = new Chart(ctx, config);
    }
}

function updateChart(invested, interest) {
    if (ppfChartInstance) {
        ppfChartInstance.data.datasets[0].data = [invested, interest];
        ppfChartInstance.update();
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
    if (id === 'yearly') {
        if (val < 500) val = 500; if (val > 150000) val = 150000;
    } else if (id === 'tenure') {
        if (val < 15) val = 15; if (val > 50) val = 50;
    }

    if (document.getElementById(id + 'Slider')) {
        document.getElementById(id + 'Slider').value = val;
    }
    calculate();
}

function calculate() {
    const yearly = parseFloat(document.getElementById('yearlyInput').value) || 0;
    const rate = 7.1; // PPF fixed rate assumption
    const tenure = parseInt(document.getElementById('tenureInput').value) || 15;

    let balance = 0;
    let totalInvested = 0;

    // Standard PPF calc - assuming deposit at the start of financial year for max interest
    // Realistically interest is calculated monthly on min balance, compounded annually.
    for (let i = 1; i <= tenure; i++) {
        balance += yearly;
        totalInvested += yearly;
        let interest = balance * (rate / 100);
        balance += interest;
    }

    let estReturns = balance - totalInvested;

    // Displays
    document.getElementById('investedDisplay').textContent = formatRupee(totalInvested);
    document.getElementById('interestDisplay').textContent = formatRupee(estReturns);
    document.getElementById('maturityDisplay').textContent = formatRupee(balance);

    updateChart(totalInvested, estReturns);
}

document.addEventListener('DOMContentLoaded', () => {
    initChart();
    calculate();
});
