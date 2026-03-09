const formatRupee = (num) => '₹' + Math.round(num).toLocaleString('en-IN');

function syncInput(id) {
    let val = document.getElementById(id + 'Slider').value;
    document.getElementById(id + 'Input').value = val;
    calculate();
}

function syncSlider(id) {
    let val = parseFloat(document.getElementById(id + 'Input').value);

    if (document.getElementById(id + 'Slider')) {
        let sliderVal = val;
        if (id === 'balance' && val > 5000000) sliderVal = 5000000;
        if (id === 'yearsCompleted' && val > 15) sliderVal = 15;
        document.getElementById(id + 'Slider').value = sliderVal;
    }
    calculate();
}

function calculate() {
    const currentBalance = parseFloat(document.getElementById('balanceInput').value) || 0;
    const yearsCompleted = parseInt(document.getElementById('yearsCompletedInput').value) || 0;

    const rate = 7.1; // PPF standard rate

    // Eligibility logic
    let loanEligible = false;
    let withdrawalEligible = false;
    let closureEligible = false;

    // Timeline logic
    // Loan: Between 3rd and 6th financial year (yearsCompleted 2 to 5 means we are currently in 3rd to 6th FY)
    // Here we consider "years completed" strictly as full years finished.
    if (yearsCompleted >= 2 && yearsCompleted < 6) {
        loanEligible = true;
    }

    // Partial Withdrawal: from 7th financial year onwards (so 6 full years completed)
    if (yearsCompleted >= 6) {
        withdrawalEligible = true;
    }

    // Premature Closure: After 5 full financial years
    if (yearsCompleted >= 5) {
        closureEligible = true;
    }

    // --- PPF Historical Rates Table ---
    // Ministry of Finance (MoF) quarterly interest updates.
    // Format: [StartDate (YYYY-MM-DD), EndDate (YYYY-MM-DD), Rate (%)]
    const historicalRates = [
        ['2020-04-01', '2030-12-31', 7.1],
        ['2019-07-01', '2020-03-31', 7.9],
        ['2018-10-01', '2019-06-30', 8.0],
        ['2018-01-01', '2018-09-30', 7.6],
        ['2017-07-01', '2017-12-31', 7.8],
        ['2017-04-01', '2017-06-30', 7.9],
        ['2016-10-01', '2017-03-31', 8.0],
        ['2016-04-01', '2016-09-30', 8.1],
        ['2015-04-01', '2016-03-31', 8.7],
        ['2014-04-01', '2015-03-31', 8.7],
        ['2013-04-01', '2014-03-31', 8.7],
        ['2012-04-01', '2013-03-31', 8.8],
        ['2011-12-01', '2012-03-31', 8.6],
        ['2003-03-01', '2011-11-30', 8.0],
        ['1900-01-01', '2003-02-28', 9.0] // Catch all
    ].map(entry => ({ start: new Date(entry[0]), end: new Date(entry[1]), rate: entry[2] }));

    function getRateForMonth(date, isPenalized) {
        for (let r of historicalRates) {
            if (date >= r.start && date <= r.end) {
                return isPenalized ? (r.rate - 1.0) : r.rate;
            }
        }
        return isPenalized ? 6.1 : 7.1; // Fallback
    }

    // --- Chronological Ledger Reverse-Engineering ---
    // Because we only have "Years Completed" and "Current Balance", we must 
    // reverse engineer an estimated *annual investment amount* that would lead to this balance 
    // strictly using the historical rate map backwards from TODAY.
    let estYearlyInvestment = 0;
    let tempBalance = 0;
    let pastBalances = []; // End of year balances
    let pastBalancesPenalized = [];

    // Assume account was opened EXACTLY `yearsCompleted` years ago from today, on April 1st.
    // E.g. If today is 2026, and 5 years completed, opened April 1st 2021.
    const today = new Date();
    // Normalizing to start of a financial year for clean math
    const currentYear = today.getMonth() < 3 ? today.getFullYear() - 1 : today.getFullYear();
    const openingYear = currentYear - yearsCompleted;
    const openingDate = new Date(openingYear, 3, 1); // April 1st of opening year

    if (yearsCompleted > 0 && currentBalance > 0) {

        // 1. Iterate to find the correct `estYearlyInvestment` that results in `currentBalance`
        // We use a trial-and-error approach (Binary Search) to perfectly match the current balance
        // traversing the exact historical rates.
        let low = 0;
        let high = currentBalance;
        let bestGuess = 0;

        // Binary search to find exact investment required
        for (let iter = 0; iter < 50; iter++) {
            bestGuess = (low + high) / 2;
            let testBal = 0;
            let d = new Date(openingDate);

            for (let y = 0; y < yearsCompleted; y++) {
                testBal += bestGuess; // Deposit on April 1st (before 5th of month)
                let yearlyInterest = 0;

                for (let m = 0; m < 12; m++) {
                    let r = getRateForMonth(d, false);
                    yearlyInterest += testBal * (r / 100) / 12;
                    d.setMonth(d.getMonth() + 1);
                }
                testBal += yearlyInterest; // Compounded annually in March
            }

            if (testBal < currentBalance) low = bestGuess;
            else high = bestGuess;
        }

        estYearlyInvestment = bestGuess;

        // 2. Now generate the EXACT historical arrays using that investment
        let normalBal = 0;
        let penalBal = 0;
        let datePointer = new Date(openingDate);

        for (let y = 0; y < yearsCompleted; y++) {
            normalBal += estYearlyInvestment;
            penalBal += estYearlyInvestment;

            let yrInterestNormal = 0;
            let yrInterestPenal = 0;

            for (let m = 0; m < 12; m++) {
                let normRate = getRateForMonth(datePointer, false);
                let penalRate = getRateForMonth(datePointer, true);

                yrInterestNormal += normalBal * (normRate / 100) / 12;
                yrInterestPenal += penalBal * (penalRate / 100) / 12;

                datePointer.setMonth(datePointer.getMonth() + 1);
            }

            normalBal += yrInterestNormal;
            penalBal += yrInterestPenal;

            pastBalances.push(normalBal);
            pastBalancesPenalized.push(penalBal);
        }

    } else {
        // If 0 years completed, empty histories
        for (let i = 0; i < 15; i++) {
            pastBalances.push(0);
            pastBalancesPenalized.push(0);
        }
    }

    // Fix slight floating point deviations
    if (pastBalances.length > 0) pastBalances[pastBalances.length - 1] = currentBalance;

    // Optional error limits mapping roughly to max PPF guidelines (1.5L max per yr)
    const errorEl = document.getElementById('balanceError');
    if (errorEl) {
        let maxTheoretical = 0;
        for (let i = 1; i <= yearsCompleted; i++) {
            maxTheoretical += 150000;
            maxTheoretical += maxTheoretical * 0.071;
        }
        if (currentBalance > maxTheoretical && yearsCompleted > 0) {
            errorEl.textContent = `Note: Max valid balance for ${yearsCompleted} yrs is ~${formatRupee(maxTheoretical)}. Results are extrapolated.`;
            errorEl.classList.remove('hidden');
        } else if (yearsCompleted === 0 && currentBalance > 0) {
            errorEl.textContent = `You cannot have a current balance for 0 years completed.`;
            errorEl.classList.remove('hidden');
        } else {
            errorEl.classList.add('hidden');
        }
    }

    // --- 1. LOAN AMOUNT (25% of balance at end of 2nd preceding year) ---
    // If year 3 (2 yrs completed), 2nd preceding year end is yr 1 (index 0).
    // If year 6 (5 yrs completed), 2nd preceding year end is yr 4 (index 3).
    let loanAmount = 0;
    if (loanEligible) {
        // yearsCompleted is the number of full years the account has lived through.
        // We are currently IN the (yearsCompleted + 1)th year.
        // Preceding year is yearsCompleted.
        // 2nd preceding year is yearsCompleted - 1.
        let targetIndexForLoan = (yearsCompleted - 1) - 1; // 0-indexed past balances
        if (targetIndexForLoan >= 0 && targetIndexForLoan < pastBalances.length) {
            loanAmount = pastBalances[targetIndexForLoan] * 0.25;
        }
    }

    // --- 2. PARTIAL WITHDRAWAL AMOUNT ---
    // Lower of 50% of 4th preceding year OR 50% of preceding year
    let withdrawAmount = 0;
    if (withdrawalEligible) {
        let precedingYrIndex = yearsCompleted - 1;
        let fourthPrecedingYrIndex = yearsCompleted - 4 - 1; // 4th preceding year

        let balPreceding = (precedingYrIndex >= 0 && precedingYrIndex < pastBalances.length) ? pastBalances[precedingYrIndex] : 0;
        let balFourth = (fourthPrecedingYrIndex >= 0 && fourthPrecedingYrIndex < pastBalances.length) ? pastBalances[fourthPrecedingYrIndex] : 0;

        // Sometimes the 4th preceding year doesn't exist (e.g. at 6 yrs completed, 4th preceding is yr 2). 
        // If it was opened at end of 7th yr, 4th preceding is yr 3.
        withdrawAmount = Math.min(balPreceding * 0.5, balFourth * 0.5);
    }

    // --- 3. CLOSURE VALUE & PENALTY ---
    let closedValue = 0;
    let actualValueIfNoPenalty = currentBalance;

    if (closureEligible && yearsCompleted > 0) {
        closedValue = pastBalancesPenalized[yearsCompleted - 1];
    } else if (yearsCompleted > 0) {
        // Calculate what they would lose IF they were eligible (for the tooltip/displau)
        closedValue = pastBalancesPenalized[yearsCompleted - 1];
    }

    let penaltyLost = actualValueIfNoPenalty - closedValue;
    if (penaltyLost < 0 || yearsCompleted === 0) penaltyLost = 0;

    // --- DOM UPDATES ---

    // Option 1 Update
    const loanDot = document.getElementById('loanStatusDot');
    const loanTag = document.getElementById('loanTag');
    const loanDisplay = document.getElementById('loanDisplay');

    if (loanEligible && currentBalance > 0) {
        loanDot.style.backgroundColor = '#10b981'; // emerald-500
        loanTag.textContent = 'Eligible';
        loanTag.className = 'text-[10px] uppercase font-bold px-2 py-1 rounded bg-emerald-100 text-emerald-700';
        loanDisplay.textContent = formatRupee(loanAmount);
    } else {
        loanDot.style.backgroundColor = '#cbd5e1'; // slate-300
        loanTag.textContent = 'Not Eligible';
        loanTag.className = 'text-[10px] uppercase font-bold px-2 py-1 rounded bg-slate-100 text-slate-500';
        loanDisplay.textContent = '₹0';
    }

    // Option 2 Update
    const wdDot = document.getElementById('withdrawalStatusDot');
    const wdTag = document.getElementById('withdrawalTag');
    const wdDisplay = document.getElementById('withdrawalDisplay');

    if (withdrawalEligible && currentBalance > 0) {
        wdDot.style.backgroundColor = '#10b981';
        wdTag.textContent = 'Eligible';
        wdTag.className = 'text-[10px] uppercase font-bold px-2 py-1 rounded bg-emerald-100 text-emerald-700';
        wdDisplay.textContent = formatRupee(withdrawAmount);
    } else {
        wdDot.style.backgroundColor = '#cbd5e1';
        wdTag.textContent = 'Not Eligible';
        wdTag.className = 'text-[10px] uppercase font-bold px-2 py-1 rounded bg-slate-100 text-slate-500';
        wdDisplay.textContent = '₹0';
    }

    // Option 3 Update
    const closureDot = document.getElementById('closureStatusDot');
    const closureTag = document.getElementById('closureTag');
    const closureDisplay = document.getElementById('closureValueDisplay');
    const penaltyDisplay = document.getElementById('penaltyDisplay');

    if (closureEligible && currentBalance > 0) {
        closureDot.style.backgroundColor = '#10b981';
        closureTag.textContent = 'Eligible';
        closureTag.className = 'text-[10px] uppercase font-bold px-2 py-1 rounded bg-emerald-100 text-emerald-700';
        closureDisplay.textContent = formatRupee(closedValue);
        penaltyDisplay.textContent = `You lose ${formatRupee(penaltyLost)} strictly to the 1% penalty.`;
    } else if (currentBalance > 0) {
        closureDot.style.backgroundColor = '#f43f5e';
        closureTag.textContent = 'Locked';
        closureTag.className = 'text-[10px] uppercase font-bold px-2 py-1 rounded bg-rose-100 text-rose-700';
        closureDisplay.textContent = 'LOCKED';
        penaltyDisplay.textContent = `A minimum of 5 full years must be completed to close.`;
    } else {
        closureDot.style.backgroundColor = '#cbd5e1';
        closureTag.textContent = 'Not Eligible';
        closureTag.className = 'text-[10px] uppercase font-bold px-2 py-1 rounded bg-slate-100 text-slate-500';
        closureDisplay.textContent = '₹0';
        penaltyDisplay.textContent = `You lose ₹0 to 1% interest restructuring.`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    calculate();
});
