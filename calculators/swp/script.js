const formatRupee = (num) => '₹' + Math.round(num).toLocaleString('en-IN');

let swpChartInstance = null;

// Initialize Chart.js
function initChart() {
    const ctx = document.getElementById('swpChart').getContext('2d');

    // Default data before calculation
    const data = {
        labels: ['Total Withdrawal', 'Final Value'],
        datasets: [{
            data: [50, 50],
            backgroundColor: ['#10b981', '#94a3b8'], // emerald-500 and slate-400
            hoverBackgroundColor: ['#059669', '#64748b'],
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
                        font: {
                            family: 'Inter, system-ui, sans-serif',
                            size: 13
                        }
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

    swpChartInstance = new Chart(ctx, config);
}

// Update the chart with new data
function updateChart(withdrawal, finalValue) {
    if (swpChartInstance) {
        swpChartInstance.data.datasets[0].data = [withdrawal, finalValue];
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

    for (let i = 1; i <= n; i++) {
        // Add interest for the month (beginning of month balance)
        const interest = balance * R;
        balance += interest;

        // Subtract withdrawal at the end of the month
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

    updateChart(totalWithdrawn, finalValue);
}

// On DOM ready
document.addEventListener('DOMContentLoaded', () => {
    initChart();
    calculateSWP();
});
