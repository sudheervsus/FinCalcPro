const formatRupee = (num) => '₹' + Math.round(num).toLocaleString('en-IN');

let salaryChartInstance = null;

// Initialize Chart.js
function initChart() {
    const ctx = document.getElementById('salaryChart').getContext('2d');

    const data = {
        labels: ['Take-Home', 'PF & Deductions'],
        datasets: [{
            data: [80, 20],
            backgroundColor: ['#14b8a6', '#f43f5e'], // teal-500 and rose-500
            hoverBackgroundColor: ['#0d9488', '#e11d48'],
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

    salaryChartInstance = new Chart(ctx, config);
}

// Update the chart with new data
function updateChart(takeHome, deductions) {
    if (salaryChartInstance) {
        salaryChartInstance.data.datasets[0].data = [takeHome, deductions];
        salaryChartInstance.update();
    }
}

// Sync between Input and Slider
function syncInput(id) {
    const sliderValue = document.getElementById(id + 'Slider').value;
    document.getElementById(id + 'Input').value = sliderValue;
    calculateSalary();
}

function syncSlider(id) {
    let inputValue = parseFloat(document.getElementById(id + 'Input').value);

    // Limits
    if (id === 'ctc') {
        if (inputValue < 100000) inputValue = 100000;
    } else if (id === 'basic') {
        if (inputValue < 1) inputValue = 1;
        if (inputValue > 100) inputValue = 100;
    }

    if (document.getElementById(id + 'Slider')) {
        document.getElementById(id + 'Slider').value = inputValue;
    }
    calculateSalary();
}

// Core Math Function
function calculateSalary() {
    const ctc = parseFloat(document.getElementById('ctcInput').value) || 0;
    const basicPercent = parseFloat(document.getElementById('basicInput').value) || 0;
    const epfPercent = parseFloat(document.getElementById('epfInput').value) || 0;
    const ptMonthly = parseFloat(document.getElementById('ptInput').value) || 0;

    const includesEmployerPF = document.getElementById('employerPfToggle').checked;

    const basicAnnual = ctc * (basicPercent / 100);

    // Limits on PF. Typically it's 12% of Basic, but max capped sometimes. We do simple percentage here.
    const employerPFAnnual = includesEmployerPF ? (basicAnnual * (epfPercent / 100)) : 0;

    // Gross Annual = CTC - Employer PF
    const grossAnnual = ctc - employerPFAnnual;
    const grossMonthly = grossAnnual / 12;

    const basicMonthly = basicAnnual / 12;
    const employeePFMonthly = basicMonthly * (epfPercent / 100);

    const totalDeductionsMonthly = employeePFMonthly + ptMonthly;
    const inHandMonthly = grossMonthly - totalDeductionsMonthly;

    document.getElementById('grossMonthlyDisplay').textContent = formatRupee(grossMonthly);
    document.getElementById('deductionsDisplay').textContent = formatRupee(totalDeductionsMonthly);
    document.getElementById('inHandDisplay').textContent = formatRupee(inHandMonthly);

    updateChart(inHandMonthly, totalDeductionsMonthly);
}

// On DOM ready
document.addEventListener('DOMContentLoaded', () => {
    initChart();
    calculateSalary();
});
