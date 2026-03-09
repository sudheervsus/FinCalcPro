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

    // Rough calculation of previous balances (as if they invested equally to arrive at current balance)
    // To strictly implement 50% rules on 4th preceding year, we have to backwards engineer the balance
    // assuming they hit `currentBalance` today through constant compounding.
    // A simplified back-calculation for display purposes:
    
    // Reverse engineer an estimated annual investment to create the curve
    let estYearlyInvestment = 0;
    let tempBalance = 0;
    let pastBalances = []; // index corresponds to year. pastBalances[0] = end of yr 1.
    
    if (yearsCompleted > 0 && currentBalance > 0) {
        // Simple linear algebra style approximation 
        // to find the yearly installment that leads to currentBalance
        // Value of annuity formula simplified: r = (rate/100) -> balance = Yearly * [ ((1+r)^n - 1) / r ]
        let r = rate / 100;
        let futureValueFactor = (Math.pow(1+r, yearsCompleted) - 1) / r;
        estYearlyInvestment = currentBalance / futureValueFactor;
        
        // Re-build the array forwards
        for(let i=1; i<=yearsCompleted; i++) {
            tempBalance += estYearlyInvestment;
            tempBalance += tempBalance * r;
            pastBalances.push(tempBalance);
        }
    } else {
        // If 0 years completed, empty histories
        for(let i=0; i<15; i++) pastBalances.push(0);
    }
    
    // Ensure the last element matches exact balance
    if(pastBalances.length > 0) pastBalances[pastBalances.length-1] = currentBalance;

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
        if(targetIndexForLoan >= 0 && targetIndexForLoan < pastBalances.length) {
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
    // Recalculate everything at (rate - 1)% = 6.1%
    let closedValue = 0;
    let actualValueIfNoPenalty = currentBalance; // Use the stated balance as Truth
    if (closureEligible) {
        let penaltyRate = (rate - 1) / 100;
        let penaltyTempBal = 0;
        for(let i=1; i<=yearsCompleted; i++) {
            penaltyTempBal += estYearlyInvestment;
            penaltyTempBal += penaltyTempBal * penaltyRate;
        }
        closedValue = penaltyTempBal;
    } else {
        // If not eligible, they technically shouldn't be closing, but let's calculate what IT WOULD BE if they could.
        let penaltyRate = (rate - 1) / 100;
        let penaltyTempBal = 0;
        for(let i=1; i<=yearsCompleted; i++) {
            penaltyTempBal += estYearlyInvestment;
            penaltyTempBal += penaltyTempBal * penaltyRate;
        }
        closedValue = penaltyTempBal;
    }

    let penaltyLost = actualValueIfNoPenalty - closedValue;
    if(penaltyLost < 0) penaltyLost = 0; // Handle rounding errors on low numbers

    // --- DOM UPDATES ---

    // Option 1 Update
    const loanDot = document.getElementById('loanStatusDot');
    const loanTag = document.getElementById('loanTag');
    const loanDisplay = document.getElementById('loanDisplay');
    
    if(loanEligible && currentBalance > 0) {
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
    
    if(withdrawalEligible && currentBalance > 0) {
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
    
    if(closureEligible && currentBalance > 0) {
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
