const formatRupee = (num) => '₹' + Math.round(num).toLocaleString('en-IN');

let retirementChartInstance = null;

function initChart() {
    if (typeof document !== 'undefined' && document.getElementById('retirementChart')) {
        const ctx = document.getElementById('retirementChart').getContext('2d');
        const data = {
            labels: ['Total SIP Amount', 'Current Savings', 'Wealth Gained (Returns)'],
            datasets: [{
                data: [33, 33, 34],
                backgroundColor: ['#c084fc', '#e879f9', '#9333ea'], // purple-400, fuchsia-400, purple-600
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

        retirementChartInstance = new Chart(ctx, config);
    }
}

function updateChart(sipTotal, currentSavings, returnEarned) {
    if (retirementChartInstance) {
        retirementChartInstance.data.datasets[0].data = [sipTotal, currentSavings, returnEarned];
        retirementChartInstance.update();
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
    if (id === 'currentAge') {
        if (val < 18) val = 18; if (val > 70) val = 70;
    } else if (id === 'retirementAge') {
        if (val < 40) val = 40; if (val > 80) val = 80;
    } else if (id === 'lifeExpectancy') {
        if (val < 50) val = 50; if (val > 100) val = 100;
    } else if (id === 'expenses') {
        if (val < 5000) val = 5000; if (val > 1000000) val = 1000000;
    } else if (id === 'inflation' || id === 'preReturn' || id === 'postReturn') {
        if (val < 1) val = 1; if (val > 30) val = 30;
    } else if (id === 'existingSavings') {
        if (val < 0) val = 0; if (val > 50000000) val = 50000000;
    }

    if (document.getElementById(id + 'Slider')) {
        document.getElementById(id + 'Slider').value = val;
    }
    calculate();
}

function calculate() {
    const currentAge = parseInt(document.getElementById('currentAgeInput').value) || 0;
    const retirementAge = parseInt(document.getElementById('retirementAgeInput').value) || 0;
    const lifeExpectancy = parseInt(document.getElementById('lifeExpectancyInput').value) || 0;

    const currentExpenses = parseFloat(document.getElementById('expensesInput').value) || 0;
    const inflation = parseFloat(document.getElementById('inflationInput').value) || 0;
    const preReturn = parseFloat(document.getElementById('preReturnInput').value) || 0;
    const postReturn = parseFloat(document.getElementById('postReturnInput').value) || 0;
    const existingSavings = parseFloat(document.getElementById('existingSavingsInput').value) || 0;

    const warningBox = document.getElementById('ageWarning');
    if (currentAge >= retirementAge || retirementAge >= lifeExpectancy) {
        warningBox.classList.remove('hidden');
        document.getElementById('targetCorpusDisplay').textContent = "₹0";
        document.getElementById('futureExpensesDisplay').textContent = "₹0";
        document.getElementById('requiredSipDisplay').textContent = "₹0";
        return;
    } else {
        warningBox.classList.add('hidden');
    }

    const yearsToRetirement = retirementAge - currentAge;
    const yearsInRetirement = lifeExpectancy - retirementAge;

    // 1. Future Value of current expenses at Retirement Age
    // FV = PV * (1 + inflation)^years
    const futureMonthlyExpenses = currentExpenses * Math.pow(1 + (inflation / 100), yearsToRetirement);

    // 2. Calculate Target Corpus
    // Using Present Value of Growing Annuity formula (monthly withdrawals, growing monthly due to inflation)
    const g = (inflation / 100) / 12; // monthly inflation rate
    const r = (postReturn / 100) / 12; // monthly post-retirement return
    const nPost = yearsInRetirement * 12; // months in retirement

    let targetCorpus = 0;
    if (r === g) {
        targetCorpus = futureMonthlyExpenses * nPost;
    } else {
        targetCorpus = futureMonthlyExpenses * ((1 - Math.pow((1 + g) / (1 + r), nPost)) / (r - g)) * (1 + r);
    }

    // 3. Current Savings Growth
    const futureSavings = existingSavings * Math.pow(1 + (preReturn / 100), yearsToRetirement);

    // 4. Shortfall Calculation
    let shortfall = targetCorpus - futureSavings;
    if (shortfall < 0) shortfall = 0;

    // 5. Calculate Required Monthly SIP to reach Shortfall
    const rPre = (preReturn / 100) / 12;
    const nPre = yearsToRetirement * 12;
    let requiredSip = 0;

    if (shortfall > 0) {
        if (rPre > 0) {
            requiredSip = shortfall / (((Math.pow(1 + rPre, nPre) - 1) / rPre) * (1 + rPre));
        } else {
            requiredSip = shortfall / nPre;
        }
    }

    // Displays
    document.getElementById('futureExpensesDisplay').textContent = formatRupee(futureMonthlyExpenses);
    document.getElementById('targetCorpusDisplay').textContent = formatRupee(targetCorpus);
    document.getElementById('requiredSipDisplay').textContent = formatRupee(requiredSip);

    // Chart Data
    // We expect the target corpus to be reached by: Existing Savings (at start) + Total SIP Invested + Returns over SIP & Savings
    // Let's break down the composition of the TARGET corpus (or the fully funded corpus)
    const totalSipInvested = requiredSip * nPre;

    // We cap at targetCorpus for the chart
    let chartReturns = targetCorpus - existingSavings - totalSipInvested;
    if (chartReturns < 0) chartReturns = 0; // Edge case if no SIP needed

    updateChart(totalSipInvested, existingSavings, chartReturns);
}

document.addEventListener('DOMContentLoaded', () => {
    initChart();
    calculate();
});
