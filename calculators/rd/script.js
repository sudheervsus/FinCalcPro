const formatRupee = (num) => '₹' + Math.round(num).toLocaleString('en-IN');

let rdChartInstance = null;

function initChart() {
    if (typeof document !== 'undefined' && document.getElementById('rdChart')) {
        const ctx = document.getElementById('rdChart').getContext('2d');
        const data = {
            labels: ['Total Deposit', 'Total Interest'],
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

        rdChartInstance = new Chart(ctx, config);
    }
}

function updateChart(totalDeposit, totalInterest) {
    if (rdChartInstance) {
        rdChartInstance.data.datasets[0].data = [totalDeposit, totalInterest];
        rdChartInstance.update();
    }
}

let currentTimeType = 'yr';

function changeTimeType() {
    const timeType = document.getElementById('timeTypeSelect').value;
    if (currentTimeType === timeType) return;

    const slider = document.getElementById('timeSlider');
    const input = document.getElementById('timeInput');
    const unitLabel = document.getElementById('timeUnitLabel');
    const minLabel = document.getElementById('timeMinLabel');
    const maxLabel = document.getElementById('timeMaxLabel');

    let val = parseFloat(input.value) || 0;

    if (timeType === 'mo') {
        slider.min = 6;
        slider.max = 240;
        slider.step = 1;
        input.step = 1;
        val = Math.round(val * 12);
        unitLabel.textContent = "Mo";
        minLabel.textContent = "6 Mo";
        maxLabel.textContent = "240 Mo";
    } else {
        slider.min = 0.5;
        slider.max = 20;
        slider.step = 0.5;
        input.step = 0.5;
        val = Number((val / 12).toFixed(1));
        unitLabel.textContent = "Yr";
        minLabel.textContent = "6 Mo";
        maxLabel.textContent = "20 Yrs";
    }

    input.value = val;
    slider.value = val;
    currentTimeType = timeType;
    calculate();
}

function syncInput(id) {
    let val = document.getElementById(id + 'Slider').value;
    document.getElementById(id + 'Input').value = val;
    calculate();
}

function syncSlider(id) {
    let val = parseFloat(document.getElementById(id + 'Input').value);

    // boundaries
    if (id === 'principal') {
        if (val < 500) val = 500;
        if (val > 1000000) val = 1000000;
    } else if (id === 'rate') {
        if (val < 1) val = 1;
        if (val > 100) val = 100;
    } else if (id === 'time') {
        const timeType = document.getElementById('timeTypeSelect') ? document.getElementById('timeTypeSelect').value : 'yr';
        if (timeType === 'mo') {
            if (val < 6) val = 6;
            if (val > 240) val = 240;
        } else {
            if (val < 0.5) val = 0.5;
            if (val > 20) val = 20;
        }
    }

    if (document.getElementById(id + 'Slider')) {
        document.getElementById(id + 'Slider').value = val;
    }
    calculate();
}

function calculate() {
    const monthlyDeposit = parseFloat(document.getElementById('principalInput').value) || 0;
    const rateAnnual = parseFloat(document.getElementById('rateInput').value) || 0;
    const timeVal = parseFloat(document.getElementById('timeInput').value) || 0;
    const timeType = document.getElementById('timeTypeSelect') ? document.getElementById('timeTypeSelect').value : 'yr';
    const tYears = timeType === 'mo' ? timeVal / 12 : timeVal;

    // RD Calculation: Quarterly compounding
    const n = 4; // Frequency per year (Quarterly)
    const r = rateAnnual / 100;
    const totalMonths = tYears * 12;

    let maturityAmount = 0;
    for (let i = 1; i <= totalMonths; i++) {
        // Time remaining in years for this specific deposit
        let t = (totalMonths - i + 1) / 12;
        maturityAmount += monthlyDeposit * Math.pow(1 + (r / n), n * t);
    }

    const totalDepositAmount = monthlyDeposit * totalMonths;
    const totalInterest = maturityAmount - totalDepositAmount;

    // Output to UI
    document.getElementById('investedAmountDisplay').textContent = formatRupee(totalDepositAmount);
    document.getElementById('estReturnsDisplay').textContent = formatRupee(totalInterest);
    document.getElementById('totalValueDisplay').textContent = formatRupee(maturityAmount);

    updateChart(totalDepositAmount, totalInterest);
}

document.addEventListener('DOMContentLoaded', () => {
    initChart();
    calculate();
});
