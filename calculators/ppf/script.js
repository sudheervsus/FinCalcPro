const formatRupee = (num) => '₹' + Math.round(num).toLocaleString('en-IN');

let ppfChartInstance = null;

function initChart() {
    if (typeof document !== 'undefined' && document.getElementById('ppfChart')) {
        const ctx = document.getElementById('ppfChart').getContext('2d');
        const data = {
            labels: ['Current Balance', 'Future Investment', 'Future Interest Gained'],
            datasets: [{
                data: [0, 50, 50],
                backgroundColor: ['#3b82f6', '#94a3b8', '#0d9488'], // blue-500, slate-400, teal-600
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

function updateChart(balance, invested, interest) {
    if (ppfChartInstance) {
        ppfChartInstance.data.datasets[0].data = [balance, invested, interest];
        ppfChartInstance.update();
    }
}

function getMaxPossibleBalance(years) {
    if (years <= 0) return 0;
    let maxB = 0;
    const rate = 7.1;
    for (let i = 1; i <= years; i++) {
        maxB += 150000;
        maxB += maxB * (rate / 100);
    }
    return maxB;
}

function syncInput(id) {
    let val = document.getElementById(id + 'Slider').value;
    document.getElementById(id + 'Input').value = val;
    calculate();
}

function changeFrequency() {
    const freq = document.getElementById('frequencySelect')?.value || 'yearly';
    const slider = document.getElementById('investmentSlider');
    const input = document.getElementById('investmentInput');
    const minLabel = document.getElementById('investmentMinLabel');
    const maxLabel = document.getElementById('investmentMaxLabel');
    const errorMsg = document.getElementById('investmentError');

    let currentVal = parseFloat(input.value) || 0;

    if (freq === 'monthly') {
        slider.min = "500";
        slider.max = "12500";
        slider.step = "500";
        if (minLabel) minLabel.textContent = "₹500 (Min)";
        if (maxLabel) maxLabel.textContent = "₹12.5K (Max)";
        if (errorMsg) errorMsg.textContent = "Maximum PPF investment allowed is ₹12,500 per month.";
        let newVal = Math.round(currentVal / 12);
        if (newVal > 12500) newVal = 12500;
        if (newVal < 500) newVal = 500;
        input.value = newVal;
        slider.value = newVal;
    } else {
        slider.min = "500";
        slider.max = "150000";
        slider.step = "500";
        if (minLabel) minLabel.textContent = "₹500 (Min)";
        if (maxLabel) maxLabel.textContent = "₹1.5L (Max)";
        if (errorMsg) errorMsg.textContent = "Maximum PPF investment allowed is ₹1,50,000 per year.";
        let newVal = Math.round(currentVal * 12);
        if (newVal > 150000) newVal = 150000;
        if (newVal < 500) newVal = 500;
        input.value = newVal;
        slider.value = newVal;
    }
    calculate();
}

function syncSlider(id) {
    let val = parseFloat(document.getElementById(id + 'Input').value);

    if (document.getElementById(id + 'Slider')) {
        let sliderVal = val;
        if (id === 'investment') {
            const freq = document.getElementById('frequencySelect')?.value || 'yearly';
            const maxVal = freq === 'monthly' ? 12500 : 150000;
            if (val > maxVal) sliderVal = maxVal;
        }
        if (id === 'balance' && val > 5000000) sliderVal = 5000000;
        if (id === 'yearsCompleted' && val > 15) sliderVal = 15;
        document.getElementById(id + 'Slider').value = sliderVal;
    }
    calculate();
}

function calculate() {
    const currentBalance = parseFloat(document.getElementById('balanceInput').value) || 0;
    const yearsCompleted = parseInt(document.getElementById('yearsCompletedInput').value) || 0;
    const freq = document.getElementById('frequencySelect')?.value || 'yearly';
    let investmentAmount = parseFloat(document.getElementById('investmentInput').value) || 0;
    const extension = document.getElementById('extensionSelect').value;
    const rate = 7.1; // PPF fixed rate assumption

    // Yearly validation
    const investmentErrorEl = document.getElementById('investmentError');
    const maxVal = freq === 'monthly' ? 12500 : 150000;
    if (investmentAmount > maxVal) {
        if (investmentErrorEl) investmentErrorEl.classList.remove('hidden');
        investmentAmount = maxVal; // Cap for calculation
    } else {
        if (investmentErrorEl) investmentErrorEl.classList.add('hidden');
    }

    // Balance validation
    const maxBalance = getMaxPossibleBalance(yearsCompleted);
    const balanceErrorEl = document.getElementById('balanceError');
    if (balanceErrorEl) {
        if (currentBalance > maxBalance && yearsCompleted > 0) {
            balanceErrorEl.textContent = `Note: Max possible balance for ${yearsCompleted} yrs is ~${formatRupee(maxBalance)}.`;
            balanceErrorEl.classList.remove('hidden');
        } else if (yearsCompleted === 0 && currentBalance > 0) {
            balanceErrorEl.textContent = `You cannot have a current balance for 0 years completed.`;
            balanceErrorEl.classList.remove('hidden');
        } else {
            balanceErrorEl.classList.add('hidden');
        }
    }

    let balance = currentBalance;
    let totalInvested = 0; // future invested

    let initialRemainingYears = 15 - yearsCompleted;
    if (initialRemainingYears < 0) initialRemainingYears = 0;

    let futureYearsToSimulate = initialRemainingYears;
    let extensionMode = false;
    let investInExtension = false;

    if (extension === 'invest') {
        futureYearsToSimulate += 5;
        extensionMode = true;
        investInExtension = true;
    } else if (extension === 'no_invest') {
        futureYearsToSimulate += 5;
        extensionMode = true;
        investInExtension = false;
    }

    for (let i = 1; i <= futureYearsToSimulate; i++) {
        let isExtensionYear = (i > initialRemainingYears);
        let makeDeposit = false;

        if (!isExtensionYear) {
            makeDeposit = true;
        } else {
            if (investInExtension) {
                makeDeposit = true;
            }
        }

        let yearlyAdded = makeDeposit ? (freq === 'monthly' ? investmentAmount * 12 : investmentAmount) : 0;
        totalInvested += yearlyAdded;

        let interest = 0;
        if (makeDeposit && freq === 'monthly') {
            // formula: bal * rate + (monthly * 78) * rate / 12
            // 78/12 = 6.5
            interest = balance * (rate / 100) + investmentAmount * 6.5 * (rate / 100);
        } else if (makeDeposit && freq === 'yearly') {
            interest = (balance + yearlyAdded) * (rate / 100);
        } else {
            interest = balance * (rate / 100);
        }

        balance += yearlyAdded + interest;
    }

    let estReturns = balance - (currentBalance + totalInvested);

    // Displays
    const balanceDisplayEl = document.getElementById('currentBalanceDisplay');
    if (balanceDisplayEl) balanceDisplayEl.textContent = formatRupee(currentBalance);

    document.getElementById('investedDisplay').textContent = formatRupee(totalInvested);
    document.getElementById('interestDisplay').textContent = formatRupee(estReturns);
    document.getElementById('maturityDisplay').textContent = formatRupee(balance);

    updateChart(currentBalance, totalInvested, estReturns);
}

document.addEventListener('DOMContentLoaded', () => {
    initChart();
    calculate();
});
