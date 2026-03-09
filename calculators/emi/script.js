const formatCurrency = (amount) => '₹' + Math.round(amount).toLocaleString('en-IN');
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

let scheduleData = [];
let oneTimePayments = {};

let emiChartInstance = null;

function initChart() {
    // Only init if canvas exists (avoids Jest error)
    if (typeof document !== 'undefined' && document.getElementById('emiChart')) {
        const ctx = document.getElementById('emiChart').getContext('2d');
        const data = {
            labels: [],
            datasets: [
                {
                    type: 'line',
                    label: 'Remaining Balance',
                    data: [],
                    borderColor: '#f43f5e',
                    backgroundColor: '#f43f5e',
                    borderWidth: 2,
                    tension: 0.3,
                    yAxisID: 'y1'
                },
                {
                    type: 'bar',
                    label: 'Principal Paid',
                    data: [],
                    backgroundColor: '#94a3b8',
                    stack: 'Stack 0',
                    yAxisID: 'y'
                },
                {
                    type: 'bar',
                    label: 'Interest Paid',
                    data: [],
                    backgroundColor: '#6366f1',
                    stack: 'Stack 0',
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
                        stacked: true,
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
                                label += formatCurrency(context.raw);
                                return label;
                            }
                        }
                    }
                }
            }
        };

        emiChartInstance = new Chart(ctx, config);
    }
}

function updateChart(labels, balanceArray, principalArray, interestArray) {
    if (emiChartInstance) {
        emiChartInstance.data.labels = labels;
        emiChartInstance.data.datasets[0].data = balanceArray;
        emiChartInstance.data.datasets[1].data = principalArray;
        emiChartInstance.data.datasets[2].data = interestArray;
        emiChartInstance.update();
    }
}

// Sync UI inputs with sliders
function syncInput(id) {
    let val = document.getElementById(id + 'Slider').value;
    document.getElementById(id).value = val;
    calculate();
}

function syncSlider(id) {
    let val = document.getElementById(id).value;
    if (document.getElementById(id + 'Slider')) {
        document.getElementById(id + 'Slider').value = val;
    }
    calculate();
}


// Initiate DOM
document.addEventListener('DOMContentLoaded', () => {
    initChart();

    if (document.getElementById('currentYear')) document.getElementById('currentYear').textContent = new Date().getFullYear();

    const monthSelect = document.getElementById('startMonth');
    months.forEach((m, i) => {
        const opt = document.createElement('option');
        opt.value = i;
        opt.textContent = m;
        monthSelect.appendChild(opt);
    });

    const now = new Date();
    monthSelect.value = now.getMonth();
    document.getElementById('startYear').value = now.getFullYear();

    calculate();
});

function calculate() {
    const p = parseFloat(document.getElementById('principal').value) || 0;
    const rAnnual = parseFloat(document.getElementById('rate').value) || 0;
    let t = parseFloat(document.getElementById('tenure').value) || 0;
    const tType = document.getElementById('tenureType').value;
    const monthlyExtra = parseFloat(document.getElementById('monthlyExtra').value) || 0;

    if (p <= 0 || rAnnual <= 0 || t <= 0) {
        resetView();
        return;
    }

    const rMonthly = rAnnual / 12 / 100;
    const n = tType === 'years' ? parseInt(t * 12) : parseInt(t);

    // Base EMI Calculation
    const emi = p * rMonthly * Math.pow(1 + rMonthly, n) / (Math.pow(1 + rMonthly, n) - 1);
    document.getElementById('baseEmiDisplay').textContent = formatCurrency(emi);

    // Baseline without extra payments for savings calculation
    let baselineInterest = (emi * n) - p;

    scheduleData = [];
    let balance = p;
    let totalInterest = 0;
    let totalPrincipalPaid = 0;
    let totalExtraPaid = 0;
    let monthCount = 0;

    let startM = parseInt(document.getElementById('startMonth').value);
    let startY = parseInt(document.getElementById('startYear').value);

    while (balance > 0 && monthCount < n * 2) { // safety limit
        monthCount++;
        let interestForMonth = balance * rMonthly;
        let currentMonthExtra = monthlyExtra + (oneTimePayments[monthCount] || 0);

        let expectedTotalPayment = emi + currentMonthExtra;
        let actualPayment = 0;
        let principalForMonth = 0;

        if (balance + interestForMonth <= expectedTotalPayment) {
            actualPayment = balance + interestForMonth;
            interestForMonth = interestForMonth;
            principalForMonth = balance;
            currentMonthExtra = actualPayment - interestForMonth - (emi - interestForMonth);
            if (currentMonthExtra < 0) currentMonthExtra = 0;
            balance = 0;
        } else {
            actualPayment = expectedTotalPayment;
            principalForMonth = emi - interestForMonth;
            balance = balance - principalForMonth - currentMonthExtra;
        }

        if (balance < 0) balance = 0;

        totalInterest += interestForMonth;
        totalPrincipalPaid += principalForMonth;
        totalExtraPaid += currentMonthExtra;

        let d = new Date(startY, startM + monthCount - 1, 1);

        scheduleData.push({
            id: monthCount,
            month: months[d.getMonth()],
            year: d.getFullYear(),
            monthVal: d.getMonth(),
            principal: principalForMonth,
            interest: interestForMonth,
            extra: currentMonthExtra,
            balance: balance
        });

        if (balance <= 0) break;
    }

    // Update Summary Cards
    document.getElementById('sumPrincipal').textContent = formatCurrency(p);
    document.getElementById('sumInterest').textContent = formatCurrency(totalInterest);
    document.getElementById('sumPayable').textContent = formatCurrency(p + totalInterest);

    // Group scheduleData by year for charting
    let yearlyData = {};
    scheduleData.forEach(row => {
        let y = row.year;
        if (!yearlyData[y]) yearlyData[y] = { principal: 0, interest: 0, balance: 0 };
        yearlyData[y].principal += row.principal + row.extra;
        yearlyData[y].interest += row.interest;
        yearlyData[y].balance = row.balance; // Overwrites so we get the end-of-year balance
    });

    let chartLabels = Object.keys(yearlyData);
    let chartPrincipal = chartLabels.map(y => yearlyData[y].principal);
    let chartInterest = chartLabels.map(y => yearlyData[y].interest);
    let chartBalance = chartLabels.map(y => yearlyData[y].balance);

    updateChart(chartLabels, chartBalance, chartPrincipal, chartInterest);

    // Update Savings
    const savingsBox = document.getElementById('savingsBox');
    if (monthlyExtra > 0 || Object.keys(oneTimePayments).length > 0) {
        let savedInt = baselineInterest - totalInterest;
        let savedMon = n - monthCount;
        if (savedInt < 0) savedInt = 0;
        if (savedMon < 0) savedMon = 0;

        document.getElementById('savedInterest').textContent = formatCurrency(savedInt);
        document.getElementById('savedMonths').textContent = savedMon + (savedMon === 1 ? ' Month' : ' Months');
        savingsBox.classList.remove('hidden');
        savingsBox.classList.add('flex');
    } else {
        savingsBox.classList.add('hidden');
        savingsBox.classList.remove('flex');
    }

    renderSchedule();
}

function setOneTimePayment(id, value) {
    let val = parseFloat(value);
    if (isNaN(val) || val < 0) val = 0;
    oneTimePayments[id] = val;
    calculate();
}

function renderSchedule() {
    if (scheduleData.length === 0) return;
    const tbody = document.getElementById('scheduleBody');
    tbody.innerHTML = '';

    const calType = document.getElementById('calendarType').value;
    let currentGroup = '';

    let groupTotPrinc = 0;
    let groupTotInt = 0;
    let groupTotExt = 0;

    scheduleData.forEach((row, index) => {
        // Determine group based on calendar selection
        let rowGroup = '';
        if (calType === 'standard') {
            rowGroup = row.year.toString();
        } else {
            // Indian FY: Apr (3) to Mar (2)
            let fyYear = row.monthVal >= 3 ? row.year : row.year - 1;
            rowGroup = `FY ${fyYear}-${(fyYear + 1).toString().slice(-2)}`;
        }

        // If new group, and not first row, append subtotal row
        if (currentGroup !== '' && currentGroup !== rowGroup) {
            appendGroupRow(tbody, currentGroup, groupTotPrinc, groupTotInt, groupTotExt);
            groupTotPrinc = 0; groupTotInt = 0; groupTotExt = 0;
        }

        currentGroup = rowGroup;
        groupTotPrinc += row.principal;
        groupTotInt += row.interest;
        groupTotExt += row.extra;

        const tr = document.createElement('tr');
        tr.className = 'schedule-row transition-colors';

        // One time extra input specific to this row (minus global monthly extra if any)
        // Use the onblur event to retain focus properly
        let specificExtra = (oneTimePayments[row.id] || 0);

        tr.innerHTML = `
            <td class="px-6 py-4 font-medium text-slate-700">${row.month} ${row.year}</td>
            <td class="px-6 py-4 text-slate-600">${formatCurrency(row.principal)}</td>
            <td class="px-6 py-4 text-slate-600">${formatCurrency(row.interest)}</td>
            <td class="px-6 py-4">
                <div class="flex items-center gap-1">
                    <span class="text-slate-400">₹</span>
                    <input type="number" 
                        class="w-24 px-2 py-1 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 outline-none" 
                        value="${specificExtra > 0 ? specificExtra : ''}" 
                        placeholder="0"
                        onchange="setOneTimePayment(${row.id}, this.value)">
                </div>
            </td>
            <td class="px-6 py-4 text-right font-medium text-slate-800">${formatCurrency(row.balance)}</td>
        `;
        tbody.appendChild(tr);

        // If last row, append final subtotal
        if (index === scheduleData.length - 1) {
            appendGroupRow(tbody, currentGroup, groupTotPrinc, groupTotInt, groupTotExt);
        }
    });
}

function appendGroupRow(tbody, title, p, i, e) {
    const tr = document.createElement('tr');
    tr.className = 'bg-slate-100/80 font-semibold text-slate-700 text-xs uppercase tracking-wider border-y border-slate-200';
    tr.innerHTML = `
        <td class="px-6 py-3">${title} Total</td>
        <td class="px-6 py-3">${formatCurrency(p)}</td>
        <td class="px-6 py-3">${formatCurrency(i)}</td>
        <td class="px-6 py-3">${formatCurrency(e)}</td>
        <td class="px-6 py-3 text-right">-</td>
    `;
    tbody.appendChild(tr);
}

function resetView() {
    document.getElementById('sumPrincipal').textContent = '₹0';
    document.getElementById('sumInterest').textContent = '₹0';
    document.getElementById('sumPayable').textContent = '₹0';
    document.getElementById('baseEmiDisplay').textContent = '₹0';
    document.getElementById('scheduleBody').innerHTML = '';
    document.getElementById('savingsBox').classList.add('hidden');
    document.getElementById('savingsBox').classList.remove('flex');
    scheduleData = [];
}
