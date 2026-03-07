const fs = require('fs');
const path = require('path');

// Mock Canvas context to avoid jsdom errors
HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
    fillRect: jest.fn(),
    clearRect: jest.fn(),
    getImageData: jest.fn(),
    putImageData: jest.fn(),
    createImageData: jest.fn(),
    setTransform: jest.fn(),
    drawImage: jest.fn(),
    save: jest.fn(),
    fillText: jest.fn(),
    restore: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    closePath: jest.fn(),
    stroke: jest.fn(),
    translate: jest.fn(),
    scale: jest.fn(),
    rotate: jest.fn(),
    arc: jest.fn(),
    fill: jest.fn(),
    measureText: jest.fn(() => ({ width: 0 })),
    transform: jest.fn(),
    rect: jest.fn(),
    clip: jest.fn(),
}));

function loadCalculator(folderName) {
    const htmlPath = path.resolve(__dirname, `../calculators/${folderName}/index.html`);
    const jsPath = path.resolve(__dirname, `../calculators/${folderName}/script.js`);

    const html = fs.readFileSync(htmlPath, 'utf8');
    const js = fs.readFileSync(jsPath, 'utf8');

    document.documentElement.innerHTML = html.toString();

    window.Chart = jest.fn().mockImplementation(() => ({
        data: { labels: [], datasets: [{ data: [] }, { data: [] }] },
        update: jest.fn()
    }));

    const oldAddEventListener = document.addEventListener;
    document.addEventListener = jest.fn((event, cb) => {
        if (event === 'DOMContentLoaded') {
            cb();
        }
    });

    try {
        // Run script and bind the local functions to window context
        // This makes calculate(), syncSlider(), etc., accessible globally inside Jest
        eval(js + '; window.calculate = typeof calculate === "function" ? calculate : undefined;');
    } catch (e) {
        console.error("Eval Error in " + folderName + ":", e);
    }

    document.addEventListener = oldAddEventListener;
}

function parseDisplay(valString) {
    return parseFloat(valString.replace(/[^0-9.-]+/g, ""));
}

describe('Deep Mathematical Review of FinCalcPro Calculators', () => {

    beforeEach(() => {
        document.documentElement.innerHTML = '';
        jest.clearAllMocks();
    });

    test('1. Income Tax Calculator - New Regime 87A Marginal Relief Math', () => {
        loadCalculator('tax');

        document.getElementById('incomeInput').value = "750000";
        document.getElementById('deductionInput').value = "0";
        document.getElementById('salariedCheck').checked = true;

        window.calculate();

        let newTaxDisplay = parseDisplay(document.getElementById('newTaxDisplay').textContent);
        expect(newTaxDisplay).toBe(0);

        document.getElementById('incomeInput').value = "760000";
        window.calculate();

        newTaxDisplay = parseDisplay(document.getElementById('newTaxDisplay').textContent);
        expect(newTaxDisplay).toBe(10400);
    });

    test('2. Income Tax Calculator - Old Regime Surcharge/Rebate Math', () => {
        loadCalculator('tax');

        document.getElementById('incomeInput').value = "550000";
        document.getElementById('deductionInput').value = "0";
        document.getElementById('salariedCheck').checked = true;

        window.calculate();

        let oldTaxDisplay = parseDisplay(document.getElementById('oldTaxDisplay').textContent);
        expect(oldTaxDisplay).toBe(0);

        document.getElementById('incomeInput').value = "600000";
        window.calculate();

        oldTaxDisplay = parseDisplay(document.getElementById('oldTaxDisplay').textContent);
        expect(oldTaxDisplay).toBe(23400);
    });

    test('3. FIRE Calculator - Compound Target Intercept', () => {
        loadCalculator('fire');

        document.getElementById('ageInput').value = "30";
        document.getElementById('swrInput').value = "4.0";
        document.getElementById('expensesInput').value = "100000";

        document.getElementById('monthlyInput').value = "50000";
        document.getElementById('portfolioInput').value = "0";
        document.getElementById('roiInput').value = "10.0";

        window.calculate();

        let targetDisplay = parseDisplay(document.getElementById('targetCorpusDisplay').textContent);
        expect(targetDisplay).toBe(2500000);

        let years = parseDisplay(document.getElementById('yrsToTargetDisplay').textContent);
        expect(years).toBeGreaterThan(0);
        expect(years).toBeLessThan(100);

        let fiAge = parseDisplay(document.getElementById('fiAgeDisplay').textContent);
        expect(fiAge).toBe(30 + years);
    });

    test('4. PPF Calculator - Compound Loop Accrual', () => {
        loadCalculator('ppf');

        document.getElementById('yearlyInput').value = "150000";
        document.getElementById('tenureInput').value = "15";

        window.calculate();

        let invested = parseDisplay(document.getElementById('investedDisplay').textContent);
        expect(invested).toBe(2250000);

        let maturity = parseDisplay(document.getElementById('maturityDisplay').textContent);
        expect(maturity).toBeGreaterThan(4000000);
        expect(maturity).toBeLessThan(4100000);
    });

    test('5. Compound Interest - Frequency Adjustments', () => {
        loadCalculator('compound-interest');

        document.getElementById('principalInput').value = "100000";
        document.getElementById('rateInput').value = "10";
        document.getElementById('timeInput').value = "10";
        document.getElementById('frequencySelect').value = "1";

        window.calculate();
        let annualMaturity = parseDisplay(document.getElementById('totalValueDisplay').textContent);
        expect(Math.round(annualMaturity)).toBe(259374);

        document.getElementById('frequencySelect').value = "12";
        window.calculate();
        let monthlyMaturity = parseDisplay(document.getElementById('totalValueDisplay').textContent);
        expect(monthlyMaturity).toBeGreaterThan(annualMaturity);
    });

});
