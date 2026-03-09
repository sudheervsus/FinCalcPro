const formatRupee = (num) => '₹' + Math.round(num).toLocaleString('en-IN');

let lumpChartInstance = null;

function initChart() {
    if (typeof document !== 'undefined' && document.getElementById('lumpChart')) {
        const ctx = document.getElementById('lumpChart').getContext('2d');
        const data = {
            labels: [],
            datasets: [
                {
                    label: 'Total Investment',
                    data: [],
                    backgroundColor: '#94a3b8', // slate-400
                    borderWidth: 0,
                    borderRadius: 4
                },
                {
                    label: 'Est. Returns',
                    data: [],
                    backgroundColor: '#10b981', // emerald-500
                    borderWidth: 0,
                    borderRadius: 4
                }
            ]
        };

        const config = {
            type: 'bar',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                scales: {
                    x: {
                        stacked: true,
                        grid: { display: false }
                    },
                    y: {
                        stacked: true,
                        border: { display: false },
                        ticks: {
                            callback: function (value) {
                                if (value >= 10000000) return '₹' + (value / 10000000).toFixed(1) + 'Cr';
                                if (value >= 100000) return '₹' + (value / 100000).toFixed(1) + 'L';
                                if (value >= 1000) return '₹' + (value / 1000).toFixed(0) + 'K';
                                return '₹' + value;
                            }
                        }
                    }
                },
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
                                let label = context.dataset.label || '';
                                if (label) label += ': ';
                                label += formatRupee(context.raw);
                                return label;
                            }
                        }
                    }
                }
            }
        };

        lumpChartInstance = new Chart(ctx, config);
    }
}

function updateChart(labels, principalData, returnsData) {
    if (lumpChartInstance) {
        lumpChartInstance.data.labels = labels;
        lumpChartInstance.data.datasets[0].data = principalData;
        lumpChartInstance.data.datasets[1].data = returnsData;
        lumpChartInstance.update();
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
        slider.max = 480;
        slider.step = 1;
        input.step = 1;
        val = Math.max(6, Math.round(val * 12));
        unitLabel.textContent = "Mo";
        minLabel.textContent = "6 Mo";
        maxLabel.textContent = "480 Mo";
    } else {
        slider.min = 0.5;
        slider.max = 40;
        slider.step = 0.5;
        input.step = 0.5;
        val = Math.max(0.5, Number((val / 12).toFixed(1)));
        unitLabel.textContent = "Yr";
        minLabel.textContent = "0.5 Yr";
        maxLabel.textContent = "40 Yrs";
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
        if (val < 5000) val = 5000;
        if (val > 100000000) val = 100000000;
    } else if (id === 'rate') {
        if (val < 1) val = 1;
        if (val > 100) val = 100;
    } else if (id === 'time') {
        const timeType = document.getElementById('timeTypeSelect') ? document.getElementById('timeTypeSelect').value : 'yr';
        if (timeType === 'mo') {
            if (val < 6) val = 6;
            if (val > 480) val = 480;
        } else {
            if (val < 0.5) val = 0.5;
            if (val > 40) val = 40;
        }
    }

    if (document.getElementById(id + 'Slider')) {
        document.getElementById(id + 'Slider').value = val;
    }
    calculate();
}

function calculate() {
    const p = parseFloat(document.getElementById('principalInput').value) || 0;
    const rateAnnual = parseFloat(document.getElementById('rateInput').value) || 0;
    const timeVal = parseFloat(document.getElementById('timeInput').value) || 0;
    const timeType = document.getElementById('timeTypeSelect') ? document.getElementById('timeTypeSelect').value : 'yr';
    const tYears = timeType === 'mo' ? timeVal / 12 : timeVal;

    // Lumpsum Standard Compounding Formula: A = P(1 + r/100)^t
    const r = rateAnnual / 100;

    let chartLabels = [];
    let principalData = [];
    let returnsData = [];

    // Map the curve over time
    const totalYearsInt = Math.ceil(tYears);
    for (let year = 1; year <= totalYearsInt; year++) {
        let currentY = (year > tYears) ? tYears : year;
        if (timeType === 'mo') {
            chartLabels.push(Math.round(currentY * 12) + ' Mo');
        } else {
            chartLabels.push('Year ' + currentY);
        }

        let amountAtYear = p;
        if (currentY > 0) {
            amountAtYear = p * Math.pow(1 + r, currentY);
        }
        principalData.push(p);
        returnsData.push(amountAtYear - p);
    }

    let maturityAmount = 0;
    if (tYears > 0) {
        maturityAmount = p * Math.pow(1 + r, tYears);
    } else {
        maturityAmount = p; // fallback
    }

    const estReturns = maturityAmount - p;

    // Output to UI
    document.getElementById('investedAmountDisplay').textContent = formatRupee(p);
    document.getElementById('estReturnsDisplay').textContent = formatRupee(estReturns);
    document.getElementById('totalValueDisplay').textContent = formatRupee(maturityAmount);

    updateChart(chartLabels, principalData, returnsData);
}

document.addEventListener('DOMContentLoaded', () => {
    initChart();
    calculate();
});
