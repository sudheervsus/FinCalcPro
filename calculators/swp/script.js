const formatRupee = (num) => '₹' + Math.round(num).toLocaleString('en-IN');

let swpChartInstance = null;

function initChart() {
    if (typeof document !== 'undefined' && document.getElementById('swpChart')) {
        const ctx = document.getElementById('swpChart').getContext('2d');
        const data = {
            labels: [],
            datasets: [
                {
                    type: 'line',
                    label: 'Remaining Balance',
                    data: [],
                    borderColor: '#f43f5e', // rose-500
                    backgroundColor: '#f43f5e',
                    borderWidth: 2,
                    tension: 0.3,
                    yAxisID: 'y1'
                },
                {
                    type: 'bar',
                    label: 'Total Withdrawn',
                    data: [],
                    backgroundColor: '#10b981', // emerald-500
                    yAxisID: 'y'
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
                        grid: { display: false }
                    },
                    y: {
                        position: 'left',
                        ticks: {
                            callback: function (value) {
                                if (value >= 10000000) return '₹' + (value / 10000000).toFixed(1) + 'Cr';
                                if (value >= 100000) return '₹' + (value / 100000).toFixed(1) + 'L';
                                if (value >= 1000) return '₹' + (value / 1000).toFixed(0) + 'K';
                                return '₹' + value;
                            }
                        }
                    },
                    y1: {
                        position: 'right',
                        grid: { drawOnChartArea: false },
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

        swpChartInstance = new Chart(ctx, config);
    }
}

// Update the chart with new data
function updateChart(labels, balanceData, withdrawnData) {
    if (swpChartInstance) {
        swpChartInstance.data.labels = labels;
        swpChartInstance.data.datasets[0].data = balanceData;
        swpChartInstance.data.datasets[1].data = withdrawnData;
        swpChartInstance.update();
    }
}

// Sync between Input and Slider
function syncInput(id) {
    const sliderValue = document.getElementById(id + 'Slider').value;
    document.getElementById(id + 'Input').value = sliderValue;
    calculateSWP();
}

function syncSlider(id) {
    let inputValue = parseFloat(document.getElementById(id + 'Input').value);

    // Limits
    if (id === 'investment') {
        if (inputValue < 50000) inputValue = 50000;
        if (inputValue > 1000000000) inputValue = 1000000000; // allow large manual override
    } else if (id === 'withdrawal') {
        if (inputValue < 500) inputValue = 500;
        if (inputValue > 10000000) inputValue = 10000000;
    } else if (id === 'rate') {
        if (inputValue < 1) inputValue = 1;
        if (inputValue > 50) inputValue = 50;
    } else if (id === 'time') {
        if (inputValue < 1) inputValue = 1;
        if (inputValue > 50) inputValue = 50;
    }

    document.getElementById(id + 'Slider').value = inputValue;
    calculateSWP();
}

// Core Math Function
function calculateSWP() {
    const P = parseFloat(document.getElementById('investmentInput').value) || 0;
    const W = parseFloat(document.getElementById('withdrawalInput').value) || 0;
    const rAnnual = parseFloat(document.getElementById('rateInput').value) || 0;
    const tYears = parseFloat(document.getElementById('timeInput').value) || 0;

    const n = Math.floor(tYears * 12);
    const R = (rAnnual / 100) / 12;

    let balance = P;
    let totalWithdrawn = 0;
    let depletedMonth = 0;
    let isDepleted = false;

    let chartLabels = [];
    let balanceData = [];
    let withdrawnData = [];

    const totalYearsInt = Math.ceil(tYears);

    for (let year = 1; year <= totalYearsInt; year++) {
        let currentMonthLimit = year * 12;
        if (currentMonthLimit > n) currentMonthLimit = n;

        for (let i = ((year - 1) * 12) + 1; i <= currentMonthLimit; i++) {
            if (isDepleted) break;

            const interest = balance * R;
            balance += interest;

            if (balance >= W) {
                balance -= W;
                totalWithdrawn += W;
            } else {
                totalWithdrawn += balance;
                balance = 0;
                depletedMonth = i;
                isDepleted = true;
                break;
            }
        }

        chartLabels.push('Year ' + year);
        balanceData.push(balance);
        withdrawnData.push(totalWithdrawn);

        if (isDepleted) break;
    }

    const finalValue = Math.max(0, balance);

    document.getElementById('investedAmountDisplay').textContent = formatRupee(P);
    document.getElementById('totalWithdrawalDisplay').textContent = formatRupee(totalWithdrawn);
    document.getElementById('finalValueDisplay').textContent = formatRupee(finalValue);

    const depletionMsgEl = document.getElementById('depletionMessage');
    if (isDepleted) {
        const years = Math.floor(depletedMonth / 12);
        const months = depletedMonth % 12;
        let timeStr = '';
        if (years > 0) timeStr += years + ' Yr ';
        if (months > 0) timeStr += months + ' Mo';
        if (timeStr === '') timeStr = 'less than a month';

        depletionMsgEl.textContent = `Warning: Corpus depletes in ${timeStr.trim()}`;
        depletionMsgEl.classList.remove('text-slate-500');
        depletionMsgEl.classList.add('text-rose-400');
    } else {
        depletionMsgEl.textContent = "Corpus lasts full duration";
        depletionMsgEl.classList.add('text-slate-500');
        depletionMsgEl.classList.remove('text-rose-400');
    }

    updateChart(chartLabels, balanceData, withdrawnData);
}

// On DOM ready
document.addEventListener('DOMContentLoaded', () => {
    initChart();
    calculateSWP();
});
