let partPaymentCount = 0;

function formatRupee(amount) {
    return '₹' + Math.round(amount).toLocaleString('en-IN');
}

let goldChartInstance = null;

function initChart() {
    if (typeof document !== 'undefined' && document.getElementById('goldChart')) {
        const ctx = document.getElementById('goldChart').getContext('2d');
        const data = {
            labels: ['Principal', 'Total Interest'],
            datasets: [{
                data: [50, 50],
                backgroundColor: ['#94a3b8', '#f59e0b'], // slate-400 and amber-500
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

        goldChartInstance = new Chart(ctx, config);
    }
}

function updateChart(principalAmount, interestAmount) {
    if (goldChartInstance) {
        goldChartInstance.data.datasets[0].data = [principalAmount, interestAmount];
        goldChartInstance.update();
    }
}

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


function toggleMonthlyInput() {
    const isChecked = document.getElementById('enableMonthly').checked;
    document.getElementById('monthlyPaymentContainer').style.display = isChecked ? 'block' : 'none';
}

function addPartPaymentRow() {
    partPaymentCount++;
    const container = document.getElementById('partPaymentsContainer');

    // create a row
    const row = document.createElement('div');
    row.className = "flex gap-3 items-center bg-slate-50 p-2 rounded border border-slate-200 mt-2";
    row.id = `partPaymentRow_${partPaymentCount}`;

    row.innerHTML = `
        <div class="flex-1">
            <label class="block text-xs text-slate-500 mb-1">Month #</label>
            <input type="number" min="1" class="part-month w-full px-2 py-1 text-sm border rounded focus:ring-amber-500" value="1" oninput="calculate()">
        </div>
        <div class="flex-1">
            <label class="block text-xs text-slate-500 mb-1">Amount (₹)</label>
            <input type="number" min="0" class="part-amount w-full px-2 py-1 text-sm border rounded focus:ring-amber-500" value="10000" oninput="calculate()">
        </div>
        <button onclick="removePartPaymentRow(${partPaymentCount})" class="mt-4 text-red-500 hover:text-red-700">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
        </button>
    `;
    container.appendChild(row);
    calculate();
}

function removePartPaymentRow(id) {
    document.getElementById(`partPaymentRow_${id}`).remove();
    calculate();
}

function daysInMonth(year, monthIndex) {
    return new Date(year, monthIndex + 1, 0).getDate();
}

function simulateLoan(principal, rate, tenureMonths, enableMonthly, monthlyAmount, partPayments, startDateStr) {
    let balance = principal;
    let accInt = 0;
    let totalPaid = 0;

    let currentDate = new Date(startDateStr);
    let startYear = currentDate.getFullYear();
    let startMonth = currentDate.getMonth();

    let schedule = [];

    for (let m = 1; m <= tenureMonths; m++) {
        // days calculation
        let mDate = new Date(startYear, startMonth + m - 1, 1);
        let dInM = daysInMonth(mDate.getFullYear(), mDate.getMonth());

        let monthInt = 0;
        for (let d = 0; d < dInM; d++) {
            let dailyInt = balance * (rate / 100) / 365;
            monthInt += dailyInt;
        }

        accInt += monthInt;

        // Collect payment for this month
        let payment = 0;
        if (enableMonthly) {
            payment += monthlyAmount;
        }
        if (partPayments[m]) {
            payment += partPayments[m];
        }

        // Apply Payment to principal immediately
        if (payment > 0) {
            let totalDebt = balance + accInt;
            if (payment > totalDebt) {
                payment = totalDebt; // Cap
            }
            balance -= payment;
            if (balance < 0) {
                accInt += balance; // handle negative balance reduction from accrued interest
                if (accInt < 0) accInt = 0;
                balance = 0;
            }
            totalPaid += payment;
        }

        let intAdded = 0;
        if (m % 6 === 0) {
            intAdded = accInt;
            balance += accInt; // Compounding interest into principal
            accInt = 0;
        } else if (m === tenureMonths) {
            // Also compound at the exact end of loan if not multiple of 6 so we can calculate final payable easily
            intAdded = accInt;
            balance += accInt;
            accInt = 0;
        }

        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        let mStr = monthNames[mDate.getMonth()] + " " + mDate.getFullYear();

        schedule.push({
            month: m,
            mStr: mStr,
            payment: payment,
            accruedInt: accInt,
            intAdded: intAdded,
            balance: balance + accInt // representing total outstanding
        });

        if (balance + accInt <= 0) {
            break; // loan fully paid early
        }
    }

    // final payment needed
    let finalPayable = balance + accInt;
    totalPaid += finalPayable;

    return {
        schedule,
        totalInt: totalPaid - principal,
        totalPaid: totalPaid,
        finalPayable: finalPayable
    };
}

function calculate() {
    let principal = parseFloat(document.getElementById('principal').value) || 0;
    let rate = parseFloat(document.getElementById('rate').value) || 0;
    let tenure = parseInt(document.getElementById('tenure').value) || 0;
    let startDateStr = document.getElementById('startDate').value;

    if (!startDateStr) startDateStr = new Date().toISOString().split('T')[0];

    let enableMonthly = document.getElementById('enableMonthly').checked;
    let monthlyAmount = parseFloat(document.getElementById('monthlyAmount').value) || 0;

    // Build part payments object
    let partPayments = {};
    const pMonths = document.querySelectorAll('.part-month');
    const pAmounts = document.querySelectorAll('.part-amount');

    for (let i = 0; i < pMonths.length; i++) {
        let m = parseInt(pMonths[i].value);
        let amt = parseFloat(pAmounts[i].value) || 0;
        if (m > 0 && String(amt).trim() !== "") {
            partPayments[m] = (partPayments[m] || 0) + amt;
        }
    }

    // Simulate Baseline (no payments)
    let baseline = simulateLoan(principal, rate, tenure, false, 0, {}, startDateStr);

    // Simulate User Scenario
    let scenario = simulateLoan(principal, rate, tenure, enableMonthly, monthlyAmount, partPayments, startDateStr);

    // Update Dashboard Cards
    document.getElementById('sumPrincipal').textContent = formatRupee(principal);
    document.getElementById('sumInterest').textContent = formatRupee(scenario.totalInt);
    document.getElementById('sumPayable').textContent = formatRupee(scenario.totalPaid);

    updateChart(principal, scenario.totalInt);

    // Savings calculation 
    let savedInt = baseline.totalInt - scenario.totalInt;
    let savingsBox = document.getElementById('savingsBox');

    if (savedInt > 1) { // 1 rupee threshold due to floating rounding
        savingsBox.style.display = 'flex';
        document.getElementById('savedInterest').textContent = formatRupee(savedInt);
    } else {
        savingsBox.style.display = 'none';
    }

    // Render Schedule
    let tbody = document.getElementById('scheduleBody');
    tbody.innerHTML = '';

    scenario.schedule.forEach(row => {
        let tr = document.createElement('tr');
        if (row.month % 6 === 0) tr.className = "bg-amber-50/50";

        tr.innerHTML = `
            <td class="px-4 py-4 font-medium text-slate-800">${row.mStr} <span class="text-xs text-slate-400 ml-1">(M${row.month})</span></td>
            <td class="px-4 py-4 font-semibold ${row.payment > 0 ? 'text-emerald-600' : 'text-slate-400'}">${row.payment > 0 ? formatRupee(row.payment) : '-'}</td>
            <td class="px-4 py-4 text-slate-600">${formatRupee(row.accruedInt)}</td>
            <td class="px-4 py-4 font-semibold ${row.intAdded > 0 ? 'text-amber-600' : 'text-slate-400'}">${row.intAdded > 0 ? '+ ' + formatRupee(row.intAdded) : '-'}</td>
            <td class="px-4 py-4 font-bold text-slate-800 text-right">${formatRupee(row.balance)}</td>
        `;
        tbody.appendChild(tr);
    });

    // Add a final summary row showing the balloon payment
    if (scenario.finalPayable > 0 && scenario.schedule.length > 0) {
        let finalRow = document.createElement('tr');
        finalRow.className = "bg-slate-800 text-white font-bold";
        finalRow.innerHTML = `
            <td colspan="4" class="px-4 py-4 text-right leading-relaxed">Final Balloon Payment Needed<br><span class="text-xs text-slate-400 font-normal">To completely close out your un-paid principal</span></td>
            <td class="px-4 py-4 text-right text-emerald-300 text-lg">Pay ${formatRupee(scenario.finalPayable)}</td>
        `;
        tbody.appendChild(finalRow);
    } else if (scenario.finalPayable <= 0) {
        let finalRow = document.createElement('tr');
        finalRow.className = "bg-slate-800 text-white font-bold";
        finalRow.innerHTML = `
            <td colspan="5" class="px-4 py-4 text-center text-emerald-300 text-lg">Loan fully paid off early!</td>
        `;
        tbody.appendChild(finalRow);
    }
}

// Initialize on first load
document.addEventListener('DOMContentLoaded', () => {
    initChart();
    // wait a tick if date input needs setting
    setTimeout(calculate, 100);
});
