const formatRupee = (num) => '₹' + Math.round(num).toLocaleString('en-IN');

let npsChartInstance = null;

function initChart() {
    if (typeof document !== 'undefined' && document.getElementById('npsChart')) {
        const ctx = document.getElementById('npsChart').getContext('2d');
        const data = {
            labels: ['Total Invested', 'Est. Returns'],
            datasets: [{
                data: [50, 50],
                backgroundColor: ['#94a3b8', '#0891b2'], // slate-400, cyan-600
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

        npsChartInstance = new Chart(ctx, config);
    }
}

function updateChart(invested, iterest) {
    if (npsChartInstance) {
        npsChartInstance.data.datasets[0].data = [invested, iterest];
        npsChartInstance.update();
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
    if (id === 'age') {
        if (val < 18) val = 18; if (val > 59) val = 59;
    } else if (id === 'monthly') {
        if (val < 500) val = 500; if (val > 150000) val = 150000;
    } else if (id === 'rate') {
        if (val < 5) val = 5; if (val > 15) val = 15;
    } else if (id === 'annuityPct') {
        if (val < 40) val = 40; if (val > 100) val = 100;
    } else if (id === 'annuityRt') {
        if (val < 4) val = 4; if (val > 12) val = 12;
    }

    if (document.getElementById(id + 'Slider')) {
        document.getElementById(id + 'Slider').value = val;
    }
    calculate();
}

function calculate() {
    const age = parseInt(document.getElementById('ageInput').value) || 18;
    const monthly = parseFloat(document.getElementById('monthlyInput').value) || 0;
    const rate = parseFloat(document.getElementById('rateInput').value) || 0;
    const annuityPct = parseFloat(document.getElementById('annuityPctInput').value) || 40;
    const annuityRt = parseFloat(document.getElementById('annuityRtInput').value) || 6;

    const n = (60 - age) * 12; // Assuming NPS matures at 60
    if (n <= 0) return; // safety

    const r = (rate / 100) / 12;
    const totalInvested = monthly * n;

    // SIP Future Value formula
    // M = P × ({[1 + i]^n - 1} / i) × (1 + i)  -- standard SIP assumes start of month
    let maturityAmount = 0;
    if (r > 0) {
        maturityAmount = monthly * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
    } else {
        maturityAmount = totalInvested;
    }

    // Limits
    let effectiveAnnuityPct = annuityPct;
    if (effectiveAnnuityPct < 40) effectiveAnnuityPct = 40;

    const lumpsumPct = 100 - effectiveAnnuityPct;

    const lumpsumAmount = maturityAmount * (lumpsumPct / 100);
    const annuityAmount = maturityAmount * (effectiveAnnuityPct / 100);

    const monthlyPension = (annuityAmount * (annuityRt / 100)) / 12;

    document.getElementById('totalCorpusDisplay').textContent = formatRupee(maturityAmount);
    document.getElementById('lumpsumDisplay').textContent = formatRupee(lumpsumAmount);
    document.getElementById('monthlyPensionDisplay').textContent = formatRupee(monthlyPension);

    let totalInterest = maturityAmount - totalInvested;
    updateChart(totalInvested, totalInterest);
}

document.addEventListener('DOMContentLoaded', () => {
    initChart();
    calculate();
});
