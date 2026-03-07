const formatRupee = (num) => '₹' + Math.round(num).toLocaleString('en-IN');

let fireChartInstance = null;

function initChart() {
    if (typeof document !== 'undefined' && document.getElementById('fireChart')) {
        const ctx = document.getElementById('fireChart').getContext('2d');

        const config = {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Portfolio Value',
                        data: [],
                        borderColor: '#9333ea', // purple-600
                        backgroundColor: 'rgba(147, 51, 234, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.1,
                        pointRadius: 0,
                        pointHoverRadius: 4
                    },
                    {
                        label: 'Target Corpus',
                        data: [],
                        borderColor: '#cbd5e1', // slate-300
                        borderWidth: 2,
                        borderDash: [5, 5],
                        fill: false,
                        pointRadius: 0,
                        pointHoverRadius: 0
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { font: { family: 'Inter, system-ui, sans-serif', size: 10 } }
                    },
                    y: {
                        beginAtZero: true,
                        grid: { color: '#f1f5f9' },
                        ticks: {
                            callback: function (value) {
                                if (value >= 10000000) return '₹' + (value / 10000000).toFixed(1) + 'Cr';
                                if (value >= 100000) return '₹' + (value / 100000).toFixed(1) + 'L';
                                return '₹' + (value / 1000).toFixed(0) + 'k';
                            },
                            font: { family: 'Inter, system-ui, sans-serif', size: 10 }
                        }
                    }
                },
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
                                return context.dataset.label + ': ' + formatRupee(context.raw);
                            }
                        }
                    }
                }
            }
        };

        fireChartInstance = new Chart(ctx, config);
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
        if (val < 18) val = 18; if (val > 65) val = 65;
    } else if (id === 'swr') {
        if (val < 2) val = 2; if (val > 10) val = 10;
    } else if (id === 'expenses') {
        if (val < 100000) val = 100000; if (val > 100000000) val = 100000000;
    } else if (id === 'monthly') {
        if (val < 0) val = 0; if (val > 10000000) val = 10000000;
    } else if (id === 'portfolio') {
        if (val < 0) val = 0; if (val > 500000000) val = 500000000;
    } else if (id === 'roi') {
        if (val < 1) val = 1; if (val > 15) val = 15;
    }

    if (document.getElementById(id + 'Slider')) {
        document.getElementById(id + 'Slider').value = val;
    }
    calculate();
}

function calculate() {
    const age = parseInt(document.getElementById('ageInput').value) || 28;
    const swr = parseFloat(document.getElementById('swrInput').value) || 4;
    const expenses = parseFloat(document.getElementById('expensesInput').value) || 0;
    const monthly = parseFloat(document.getElementById('monthlyInput').value) || 0;
    const currentPortfolio = parseFloat(document.getElementById('portfolioInput').value) || 0;
    const roiReal = parseFloat(document.getElementById('roiInput').value) || 7;

    // The FIRE Number (Target Corpus)
    const targetCorpus = expenses / (swr / 100);

    // Calculate years to FIRE
    let portfolio = currentPortfolio;
    let years = 0;
    let limit = 100; // max years to simulate to prevent infinite loop
    const rAnn = roiReal / 100;
    const yearlyInvestment = monthly * 12;

    const dataLabels = [];
    const dataPortfolio = [];
    const dataTarget = [];

    dataLabels.push('Age ' + age);
    dataPortfolio.push(portfolio);
    dataTarget.push(targetCorpus);

    if (portfolio >= targetCorpus) {
        years = 0;
    } else {
        while (portfolio < targetCorpus && years < limit) {
            years++;
            // Compounding annually with continuous monthly deposits approximated:
            // PV * (1+r) + PMT * [ ((1+r) - 1) / r ]  where PMT is annual if we simplify, but strictly it's monthly
            // Let's use standard compound formula for yearly addition
            // simpler approximation for visualization
            portfolio = portfolio * (1 + rAnn) + yearlyInvestment * (1 + (rAnn / 2));

            dataLabels.push('Age ' + (age + years));
            if (portfolio > targetCorpus * 1.5) {
                // cap logic just for drawing a clean chart
                dataPortfolio.push(targetCorpus * 1.2);
            } else {
                dataPortfolio.push(portfolio);
            }
            dataTarget.push(targetCorpus);
        }
    }

    const fiAge = age + years;

    document.getElementById('targetCorpusDisplay').textContent = formatRupee(targetCorpus);

    if (years === 0 && currentPortfolio >= targetCorpus) {
        document.getElementById('fiAgeDisplay').textContent = age;
        document.getElementById('yrsToTargetDisplay').textContent = 'Reached!';
        document.getElementById('fiAgeDisplay').classList.replace('text-purple-400', 'text-emerald-400');
    } else if (years >= limit) {
        document.getElementById('fiAgeDisplay').textContent = '85+';
        document.getElementById('yrsToTargetDisplay').textContent = 'Unreachable';
        document.getElementById('fiAgeDisplay').classList.replace('text-emerald-400', 'text-purple-400');
    } else {
        document.getElementById('fiAgeDisplay').textContent = fiAge;
        document.getElementById('yrsToTargetDisplay').textContent = years;
        // reset to purple if it was green before
        document.getElementById('fiAgeDisplay').classList.replace('text-emerald-400', 'text-purple-400');
    }

    if (fireChartInstance) {
        fireChartInstance.data.labels = dataLabels;
        fireChartInstance.data.datasets[0].data = dataPortfolio;
        fireChartInstance.data.datasets[1].data = dataTarget;
        fireChartInstance.update();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initChart();
    calculate();
});
