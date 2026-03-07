const fs = require('fs');
const path = require('path');

describe('Gold Loan Calculator', () => {
    beforeAll(() => {
        // Mock DOM
        document.body.innerHTML = `
            <input type="number" id="principal" value="500000">
            <input type="number" id="rate" value="9.0">
            <input type="number" id="tenure" value="12">
            <input type="date" id="startDate" value="2026-03-07">
            
            <input type="checkbox" id="enableMonthly" onchange="toggleMonthlyInput()">
            <div id="monthlyPaymentContainer" class="hidden"></div>
            <input type="number" id="monthlyAmount" value="5000">
            
            <div id="partPaymentsContainer"></div>
            
            <div id="sumPrincipal"></div>
            <div id="sumInterest"></div>
            <div id="sumPayable"></div>
            
            <div id="savingsBox" class="hidden"></div>
            <div id="savedInterest"></div>
            <table><tbody id="scheduleBody"></tbody></table>
        `;

        const scriptCode = fs.readFileSync(path.resolve(__dirname, 'script.js'), 'utf8');
        window.eval(scriptCode);
    });

    it('should accurately process bullet repayment with zero payments', () => {
        document.getElementById('enableMonthly').checked = false;

        window.calculate();

        console.log("Debug value:", document.getElementById('sumInterest').textContent);

        const interestStr = document.getElementById('sumInterest').textContent.replace(/[^0-9]/g, '');
        const interestVal = parseInt(interestStr);
        // It outputs NaN because replacing '₹0' gives '0', but wait: Math.round(NaN)? 
        // We will see what console.log says.
        expect(interestVal).toBeGreaterThan(45000);
    });

    it('should save interest successfully when monthly payments are enabled', () => {
        document.getElementById('enableMonthly').checked = true;
        window.calculate();

        let interestStr = document.getElementById('sumInterest').textContent.replace(/[^0-9]/g, '');
        let newInterest = parseInt(interestStr);
        expect(newInterest).toBeLessThan(46012);
    });

    it('should apply part payments and deduct principal immediately', () => {
        window.addPartPaymentRow();
        const months = document.querySelectorAll('.part-month');
        const amounts = document.querySelectorAll('.part-amount');
        months[months.length - 1].value = '4';
        amounts[amounts.length - 1].value = '50000';
        window.calculate();

        let newInterest = parseInt(document.getElementById('sumInterest').textContent.replace(/[^0-9]/g, ''));
        expect(newInterest).toBeLessThan(43527);
    });
});
