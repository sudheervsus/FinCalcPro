const formatRupee = (num) => '₹' + Math.round(num).toLocaleString('en-IN');

let isGovt = false; // default to Non-Government

function setSector(sector) {
    const btnGovt = document.getElementById('btnGovt');
    const btnNonGovt = document.getElementById('btnNonGovt');

    if (sector === 'govt') {
        isGovt = true;
        btnGovt.classList.replace('text-slate-500', 'text-indigo-700');
        btnGovt.classList.replace('border-transparent', 'border-slate-200');
        btnGovt.classList.add('bg-white', 'shadow-sm');

        btnNonGovt.classList.replace('text-indigo-700', 'text-slate-500');
        btnNonGovt.classList.replace('border-slate-200', 'border-transparent');
        btnNonGovt.classList.remove('bg-white', 'shadow-sm');
    } else {
        isGovt = false;
        btnNonGovt.classList.replace('text-slate-500', 'text-indigo-700');
        btnNonGovt.classList.replace('border-transparent', 'border-slate-200');
        btnNonGovt.classList.add('bg-white', 'shadow-sm');

        btnGovt.classList.replace('text-indigo-700', 'text-slate-500');
        btnGovt.classList.replace('border-slate-200', 'border-transparent');
        btnGovt.classList.remove('bg-white', 'shadow-sm');
    }
    calculate();
}

function syncInput(id) {
    let val = document.getElementById(id + 'Slider').value;
    document.getElementById(id + 'Input').value = val;
    calculate();
}

function syncSlider(id) {
    let val = parseFloat(document.getElementById(id + 'Input').value);

    // Dynamic caps
    if (id === 'ownContrib') {
        const corpus = parseFloat(document.getElementById('corpusInput').value) || 0;
        if (val > corpus) val = corpus;
    }

    if (document.getElementById(id + 'Slider')) {
        document.getElementById(id + 'Slider').value = val;
    }
    calculate();
}

function calculate() {
    const age = parseInt(document.getElementById('ageInput').value) || 0;
    const years = parseInt(document.getElementById('yearsInput').value) || 0;
    const corpus = parseFloat(document.getElementById('corpusInput').value) || 0;
    let ownContrib = parseFloat(document.getElementById('ownContribInput').value) || 0;

    // Safety checks
    const contribError = document.getElementById('contribError');
    if (ownContrib > corpus) {
        ownContrib = corpus;
        if(contribError) {
            contribError.textContent = "Your own contribution cannot exceed total corpus.";
            contribError.classList.remove('hidden');
        }
    } else {
        if(contribError) contribError.classList.add('hidden');
    }
    document.getElementById('ownContribSlider').max = corpus;

    // --- Lien Provision (Loan) ---
    // Loan on NPS: 25% of own contributions
    const lienAmount = ownContrib * 0.25;
    document.getElementById('lienDisplay').textContent = formatRupee(lienAmount);

    // --- 1. Partial Withdrawal ---
    // Eligibility: Available after 3 years
    let partialEligible = false;
    let partialAmount = 0;
    
    if (years >= 3 && age < 60) {
        partialEligible = true;
        // Amount: Max 25% of subscriber's own contributions
        partialAmount = ownContrib * 0.25;
    } else if (years >= 3 && age >= 60) {
        // Technically, if they haven't exited normally yet, they might still be eligible for partial,
        // but typically past 60 moves to Normal Exit. We will restrict partial to < 60 for clarity unless requested otherwise.
    }

    // Update Partial Withdrawal UI
    const partialTag = document.getElementById('partialWithdrawalTag');
    const partialDot = document.getElementById('partialWithdrawalDot');
    
    if (partialEligible && ownContrib > 0) {
        partialTag.textContent = 'Eligible';
        partialTag.className = 'text-[10px] uppercase font-bold px-2 py-1 rounded bg-emerald-100 text-emerald-700';
        partialDot.style.backgroundColor = '#10b981'; // emerald-500
        document.getElementById('partialWithdrawalDisplay').textContent = formatRupee(partialAmount);
    } else {
        partialTag.textContent = 'Not Eligible';
        partialTag.className = 'text-[10px] uppercase font-bold px-2 py-1 rounded bg-slate-100 text-slate-500';
        partialDot.style.backgroundColor = '#cbd5e1'; // slate-300
        document.getElementById('partialWithdrawalDisplay').textContent = '₹0';
    }


    // --- 2. Premature Exit ---
    // Minimum Tenure: at least 5 years.
    // Applicable if Age < 60. ALSO applicable if Age >= 60 BUT years < 15.
    let prematureEligible = false;
    let prematureLumpSum = 0;
    let prematureAnnuity = 0;

    if (years >= 5 && (age < 60 || (age >= 60 && years < 15))) {
        prematureEligible = true;

        if (corpus <= 250000) {
            // Corpus <= 2.5 Lakh: 100% Tax-Free Lump Sum
            prematureLumpSum = corpus;
            prematureAnnuity = 0;
        } else {
            // Corpus > 2.5 Lakh: Max 20% Tax-Free, 80% Annuity
            prematureLumpSum = corpus * 0.20;
            prematureAnnuity = corpus * 0.80;
        }
    }

    // Update Premature UI
    const prematureTag = document.getElementById('prematureExitTag');
    const prematureDot = document.getElementById('prematureExitDot');
    
    if (prematureEligible && corpus > 0) {
        prematureTag.textContent = 'Eligible';
        prematureTag.className = 'text-[10px] uppercase font-bold px-2 py-1 rounded bg-amber-100 text-amber-700';
        prematureDot.style.backgroundColor = '#f59e0b'; // amber-500
        document.getElementById('prematureExitLumpsumDisplay').textContent = formatRupee(prematureLumpSum);
        document.getElementById('prematureExitAnnuityDisplay').textContent = formatRupee(prematureAnnuity);
    } else {
        prematureTag.textContent = 'Not Eligible';
        prematureTag.className = 'text-[10px] uppercase font-bold px-2 py-1 rounded bg-slate-100 text-slate-500';
        prematureDot.style.backgroundColor = '#cbd5e1'; 
        document.getElementById('prematureExitLumpsumDisplay').textContent = '₹0';
        document.getElementById('prematureExitAnnuityDisplay').textContent = '₹0';
    }


    // --- 3. Normal Exit (Retirement) ---
    // Eligibility: Age >= 60 AND Years >= 15
    let normalEligible = false;
    let normalLumpSum = 0;
    let normalLumpSumTaxFree = 0;
    let normalLumpSumTaxable = 0;
    let normalAnnuity = 0;
    let normalSur = 0;

    if (age >= 60 && years >= 15) {
        normalEligible = true;

        if (!isGovt) {
            // Non-Government
            if (corpus <= 800000) {
                // Entire 100% Tax-Free
                normalLumpSum = corpus;
                normalLumpSumTaxFree = corpus;
            } else if (corpus > 800000 && corpus <= 1200000) {
                // Up to 6L Lump Sum, rest Annuity/SUR
                normalLumpSum = 600000;
                normalLumpSumTaxFree = 600000;
                normalAnnuity = corpus - 600000;
            } else {
                // Corpus > 12 Lakhs
                // Max 80% lump sum (60% Tax-Free, 20% Taxable). 20% Annuity.
                normalLumpSum = corpus * 0.80;
                normalLumpSumTaxFree = corpus * 0.60;
                normalLumpSumTaxable = corpus * 0.20;
                normalAnnuity = corpus * 0.20;
            }
        } else {
            // Government
            if (corpus <= 800000) {
                // Entire 100% Tax-Free
                normalLumpSum = corpus;
                normalLumpSumTaxFree = corpus;
            } else {
                // Max 60% Tax-Free, 40% Annuity
                normalLumpSum = corpus * 0.60;
                normalLumpSumTaxFree = corpus * 0.60;
                normalAnnuity = corpus * 0.40;
            }
        }
    }

    // Update Normal Exit UI
    const normalTag = document.getElementById('normalExitTag');
    const normalDot = document.getElementById('normalExitDot');
    const normalTaxNote = document.getElementById('normalExitTaxNote');
    
    if (normalEligible && corpus > 0) {
        normalTag.textContent = 'Eligible';
        normalTag.className = 'text-[10px] uppercase font-bold px-2 py-1 rounded bg-indigo-100 text-indigo-700';
        normalDot.style.backgroundColor = '#4f46e5'; // indigo-600
        
        document.getElementById('normalExitLumpsumDisplay').textContent = formatRupee(normalLumpSum);
        document.getElementById('normalExitAnnuityDisplay').textContent = formatRupee(normalAnnuity);
        
        if (normalLumpSumTaxable > 0) {
            normalTaxNote.textContent = `* Of your ${formatRupee(normalLumpSum)} lump sum, ${formatRupee(normalLumpSumTaxFree)} is tax-free and ${formatRupee(normalLumpSumTaxable)} is fully taxable!`;
            normalTaxNote.classList.remove('hidden');
        } else {
            normalTaxNote.textContent = `* 100% of your ${formatRupee(normalLumpSum)} lump sum is tax-free.`;
            normalTaxNote.classList.remove('hidden');
        }

    } else {
        normalTag.textContent = 'Not Eligible';
        normalTag.className = 'text-[10px] uppercase font-bold px-2 py-1 rounded bg-slate-100 text-slate-500';
        normalDot.style.backgroundColor = '#cbd5e1'; 
        document.getElementById('normalExitLumpsumDisplay').textContent = '₹0';
        document.getElementById('normalExitAnnuityDisplay').textContent = '₹0';
        normalTaxNote.classList.add('hidden');
    }
}

document.getElementById('corpusInput').addEventListener('input', function () {
    document.getElementById('ownContribSlider').max = this.value;
});
document.getElementById('corpusSlider').addEventListener('input', function () {
    document.getElementById('ownContribSlider').max = this.value;
});

document.addEventListener('DOMContentLoaded', () => {
    calculate();
});
