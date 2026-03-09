const formatRupee = (num) => '₹' + Math.round(num).toLocaleString('en-IN');

let hraChartInstance = null;

// Initialize Chart.js
function initChart() {
    const ctx = document.getElementById('hraChart').getContext('2d');

    const data = {
        labels: ['Exempt HRA (Tax Free)', 'Taxable HRA'],
        datasets: [{
            data: [50, 50],
            backgroundColor: ['#10b981', '#fb7185'], // emerald-500 and rose-400
            hoverBackgroundColor: ['#059669', '#f43f5e'],
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

    hraChartInstance = new Chart(ctx, config);
}

// Update the chart with new data
function updateChart(exempt, taxable) {
    if (hraChartInstance) {
        // Handle edge case where HRA received is 0, drawing chart throws no errors but blank
        if (exempt === 0 && taxable === 0) {
            hraChartInstance.data.datasets[0].data = [0, 1]; // Just to not break visually
        } else {
            hraChartInstance.data.datasets[0].data = [exempt, taxable];
        }
        hraChartInstance.update();
    }
}

// Sync between Input and Slider
function syncInput(id) {
    const sliderValue = document.getElementById(id + 'Slider').value;
    document.getElementById(id + 'Input').value = sliderValue;
    calculateHra();
}

function syncSlider(id) {
    let inputValue = parseFloat(document.getElementById(id + 'Input').value);

    if (inputValue < 0) inputValue = 0;

    if (document.getElementById(id + 'Slider')) {
        document.getElementById(id + 'Slider').value = inputValue;
    }
    calculateHra();
}

// Core Math Function
function calculateHra() {
    const basic = parseFloat(document.getElementById('basicInput').value) || 0;
    const hraReceived = parseFloat(document.getElementById('hraInput').value) || 0;
    const rentPaid = parseFloat(document.getElementById('rentInput').value) || 0;

    // City Type
    let cityMultiplier = 0.4; // default non-metro
    const cityOptions = document.getElementsByName('cityType');
    for (let c of cityOptions) {
        if (c.checked && c.value === 'metro') {
            cityMultiplier = 0.5;
            break;
        }
    }

    // Three Conditions
    const cond1 = hraReceived;
    let cond2 = rentPaid - (0.10 * basic);
    if (cond2 < 0) cond2 = 0; // Negative rent minus basic means 0 exemption on this condition
    const cond3 = basic * cityMultiplier;

    const exemptHra = Math.min(cond1, cond2, cond3);
    let taxableHra = hraReceived - exemptHra;
    if (taxableHra < 0) taxableHra = 0;

    // Output to Breakdown
    document.getElementById('cond1').textContent = formatRupee(cond1);
    document.getElementById('cond2').textContent = formatRupee(cond2);
    document.getElementById('cond3').textContent = formatRupee(cond3);

    // Output to main display
    document.getElementById('exemptHraDisplay').textContent = formatRupee(exemptHra);
    document.getElementById('taxableHraDisplay').textContent = formatRupee(taxableHra);

    updateChart(exemptHra, taxableHra);
}

// On DOM ready
document.addEventListener('DOMContentLoaded', () => {
    initChart();
    calculateHra();
});
