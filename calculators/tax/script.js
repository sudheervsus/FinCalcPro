const formatRupee = (num) => '₹' + Math.round(num).toLocaleString('en-IN');

let taxChartInstance = null;

function initChart() {
    if (typeof document !== 'undefined' && document.getElementById('taxChart')) {
        const ctx = document.getElementById('taxChart').getContext('2d');
        const data = {
            labels: ['Old Regime', 'New Regime'],
            datasets: [{
                label: 'Total Tax Payable',
                data: [1000, 1000], // default
                backgroundColor: ['#94a3b8', '#0d9488'], // slate-400, teal-600
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
                                if (value >= 100000) return '₹' + (value / 100000).toFixed(1) + 'L';
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

        taxChartInstance = new Chart(ctx, config);
    }
}

function updateChart(oldTax, newTax) {
    if (taxChartInstance) {
        taxChartInstance.data.datasets[0].data = [oldTax, newTax];
        taxChartInstance.update();
    }
}

function syncInput(id) {
    let val = document.getElementById(id + 'Slider').value;
    document.getElementById(id + 'Input').value = val;
    calculate();
}

function syncSlider(id) {
    let val = parseFloat(document.getElementById(id + 'Input').value);

    if (id === 'income') {
        if (val < 0) val = 0; if (val > 1000000000) val = 1000000000;
    } else if (id === 'deduction') {
        if (val < 0) val = 0; if (val > 50000000) val = 50000000;
    }

    if (document.getElementById(id + 'Slider')) {
        document.getElementById(id + 'Slider').value = val;
    }
    calculate();
}

function calcTaxOldRegime(taxableIncome) {
    if (taxableIncome <= 250000) return 0;
    let tax = 0;

    // 87A rebate for Old Regime
    if (taxableIncome <= 500000) return 0;

    // Slabs
    if (taxableIncome > 250000) {
        let taxable = Math.min(taxableIncome, 500000) - 250000;
        tax += taxable * 0.05;
    }
    if (taxableIncome > 500000) {
        let taxable = Math.min(taxableIncome, 1000000) - 500000;
        tax += taxable * 0.20;
    }
    if (taxableIncome > 1000000) {
        let taxable = taxableIncome - 1000000;
        tax += taxable * 0.30;
    }

    return tax;
}

function calcTaxNewRegime(taxableIncome) {
    if (taxableIncome <= 300000) return 0;
    let tax = 0;

    // 87A rebate for New Regime (up to 7,000,000)
    if (taxableIncome <= 700000) return 0;

    // Marginal Relief for New Regime over 7,000,000
    // Simplified: If the tax payable > income above 7L, restrict tax to the amount exceeding 7L.

    // Calculate base tax
    let baseTax = 0;
    if (taxableIncome > 300000) {
        let taxable = Math.min(taxableIncome, 600000) - 300000;
        baseTax += taxable * 0.05;
    }
    if (taxableIncome > 600000) {
        let taxable = Math.min(taxableIncome, 900000) - 600000;
        baseTax += taxable * 0.10;
    }
    if (taxableIncome > 900000) {
        let taxable = Math.min(taxableIncome, 1200000) - 900000;
        baseTax += taxable * 0.15;
    }
    if (taxableIncome > 1200000) {
        let taxable = Math.min(taxableIncome, 1500000) - 1200000;
        baseTax += taxable * 0.20;
    }
    if (taxableIncome > 1500000) {
        let taxable = taxableIncome - 1500000;
        baseTax += taxable * 0.30;
    }

    // Marginal relief logic just above 7L
    if (taxableIncome > 700000 && taxableIncome <= 727777) {
        let excessIncome = taxableIncome - 700000;
        if (baseTax > excessIncome) {
            baseTax = excessIncome;
        }
    }

    return baseTax;
}

function calculate() {
    const grossIncome = parseFloat(document.getElementById('incomeInput').value) || 0;
    const additionalDeductions = parseFloat(document.getElementById('deductionInput').value) || 0;
    const isSalaried = document.getElementById('salariedCheck').checked;

    const stdDeduction = isSalaried ? 50000 : 0;

    // OLD REGIME TAXABLE INCOME
    const oldTaxable = Math.max(0, grossIncome - stdDeduction - additionalDeductions);
    let oldTax = calcTaxOldRegime(oldTaxable);

    // Surcharge omitted for simplicity here, but Cess is 4%
    if (oldTax > 0) oldTax = oldTax + (oldTax * 0.04);

    // NEW REGIME TAXABLE INCOME
    // New regime allows standard deduction (since FY23-24), but NO 80C, 80D, etc.
    const newTaxable = Math.max(0, grossIncome - stdDeduction);
    let newTax = calcTaxNewRegime(newTaxable);

    if (newTax > 0) newTax = newTax + (newTax * 0.04);

    document.getElementById('oldTaxDisplay').textContent = formatRupee(oldTax);
    document.getElementById('newTaxDisplay').textContent = formatRupee(newTax);

    // Winner calculations
    const savingsOld = newTax - oldTax;
    const savingsNew = oldTax - newTax;

    const recBlock = document.getElementById('recommendationBlock');
    const recText = document.getElementById('regimeRecommendation');
    const savingDisp = document.getElementById('savingsAmountDisplay');

    if (savingsOld > 0) {
        recBlock.classList.remove('bg-teal-900', 'border-teal-700');
        recBlock.classList.add('bg-slate-900', 'border-slate-700');
        recText.classList.remove('text-teal-400');
        recText.classList.add('text-slate-300');
        recText.textContent = "Old Regime";
        savingDisp.textContent = formatRupee(savingsOld);
    } else if (savingsNew > 0) {
        recBlock.classList.remove('bg-slate-900', 'border-slate-700');
        recBlock.classList.add('bg-teal-900', 'border-teal-700');
        recText.classList.remove('text-slate-300');
        recText.classList.add('text-teal-400');
        recText.textContent = "New Regime";
        savingDisp.textContent = formatRupee(savingsNew);
    } else {
        recText.textContent = "Both Same";
        recText.classList.remove('text-teal-400', 'text-slate-300');
        recText.classList.add('text-white');
        savingDisp.textContent = '₹0';
    }

    updateChart(oldTax, newTax);
}

document.addEventListener('DOMContentLoaded', () => {
    initChart();
    calculate();
});
