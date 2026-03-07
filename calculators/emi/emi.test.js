const fs = require('fs');
const path = require('path');

describe('EMI Calculator', () => {
    beforeAll(() => {
        // Mock DOM
        document.body.innerHTML = `
            <input type="number" id="principal" value="1000000">
            <input type="number" id="rate" value="8.5">
            <input type="number" id="tenure" value="10">
            <select id="tenureType"><option value="years" selected>Years</option></select>
            <input type="number" id="monthlyExtra" value="0">
            <select id="startMonth"><option value="0" selected>Jan</option></select>
            <input type="number" id="startYear" value="2024">
            <select id="calendarType"><option value="standard" selected>Standard</option></select>
            <div id="baseEmiDisplay"></div>
            <div id="sumPrincipal"></div>
            <div id="sumInterest"></div>
            <div id="sumPayable"></div>
            <div id="savingsBox" class="hidden"></div>
            <div id="savedInterest"></div>
            <div id="savedMonths"></div>
            <table><tbody id="scheduleBody"></tbody></table>
            <span id="currentYear"></span>
        `;

        const scriptCode = fs.readFileSync(path.resolve(__dirname, 'script.js'), 'utf8');
        // Execute script in JSDOM context
        window.eval(scriptCode);
    });

    it('should calculate base EMI accurately', () => {
        window.calculate();
        const baseEmiStr = document.getElementById('baseEmiDisplay').textContent;
        // P = 10L, R=8.5%, T=10
        // EMI = 12399 approx
        expect(baseEmiStr).toContain('12,399');
    });

    it('should accurately process total interest without prepayments', () => {
        window.calculate();
        const interestStr = document.getElementById('sumInterest').textContent;
        // Expected Interest = (12399 * 120) - 1000000 = ~487820, accurate is closer to 4,87,833
        expect(interestStr).not.toBe('₹0');
        expect(interestStr.length).toBeGreaterThan(4);
        expect(document.getElementById('sumPayable').textContent).toContain('14,87,828');
    });

    it('should reduce interest when extra monthly payments are added', () => {
        // Save base interest
        window.calculate();
        let baseInterest = parseInt(document.getElementById('sumInterest').textContent.replace(/[^0-9]/g, ''));

        // Add 5000 monthly
        document.getElementById('monthlyExtra').value = '5000';
        window.calculate();

        let newInterest = parseInt(document.getElementById('sumInterest').textContent.replace(/[^0-9]/g, ''));
        let savedIntStr = document.getElementById('savedInterest').textContent;

        expect(newInterest).toBeLessThan(baseInterest);
        expect(savedIntStr).not.toBe('₹0');
        expect(document.getElementById('savingsBox').className).toContain('flex');
    });
});
