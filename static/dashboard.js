// Chart instances
let timelineChart = null;
let typeChart = null;
let accountChart = null;

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    initCharts();
    loadDashboard();
    
    // Set up refresh button
    document.getElementById('refreshBtn').addEventListener('click', function() {
        this.classList.add('loading');
        loadDashboard().finally(() => {
            this.classList.remove('loading');
        });
    });
    
    // Auto-refresh every 30 seconds
    setInterval(loadDashboard, 30000);
});

// Initialize all charts
function initCharts() {
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
            legend: {
                labels: {
                    color: '#cbd5e1'
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: { color: '#cbd5e1' },
                grid: { color: 'rgba(75, 85, 99, 0.3)' }
            },
            x: {
                ticks: { color: '#cbd5e1' },
                grid: { color: 'rgba(75, 85, 99, 0.3)' }
            }
        }
    };

    // Timeline Chart
    const timelineCtx = document.getElementById('timelineChart').getContext('2d');
    timelineChart = new Chart(timelineCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Credits',
                    data: [],
                    borderColor: '#60a5fa',
                    backgroundColor: 'rgba(96, 165, 250, 0.1)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Debits',
                    data: [],
                    borderColor: '#f87171',
                    backgroundColor: 'rgba(248, 113, 113, 0.1)',
                    tension: 0.4,
                    fill: true
                }
            ]
        },
        options: chartOptions
    });

    // Type Distribution Chart
    const typeCtx = document.getElementById('typeChart').getContext('2d');
    typeChart = new Chart(typeCtx, {
        type: 'doughnut',
        data: {
            labels: ['Credits', 'Debits'],
            datasets: [{
                data: [],
                backgroundColor: [
                    'rgba(96, 165, 250, 0.8)',
                    'rgba(248, 113, 113, 0.8)'
                ],
                borderColor: [
                    '#60a5fa',
                    '#f87171'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    labels: {
                        color: '#cbd5e1',
                        font: {
                            size: 14
                        }
                    }
                }
            }
        }
    });

    // Account Chart
    const accountCtx = document.getElementById('accountChart').getContext('2d');
    accountChart = new Chart(accountCtx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Credits',
                    data: [],
                    backgroundColor: 'rgba(96, 165, 250, 0.8)',
                    borderColor: '#60a5fa',
                    borderWidth: 1
                },
                {
                    label: 'Debits',
                    data: [],
                    backgroundColor: 'rgba(248, 113, 113, 0.8)',
                    borderColor: '#f87171',
                    borderWidth: 1
                },
                {
                    label: 'Balance',
                    data: [],
                    backgroundColor: 'rgba(52, 211, 153, 0.8)',
                    borderColor: '#34d399',
                    borderWidth: 1
                }
            ]
        },
        options: chartOptions
    });
}

// Load all dashboard data
async function loadDashboard() {
    try {
        await Promise.all([
            loadSummary(),
            loadTimeline(),
            loadTypeDistribution(),
            loadAccountData(),
            loadRecentTransactions()
        ]);
        
        updateLastUpdated();
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

// Load summary statistics
async function loadSummary() {
    try {
        const response = await fetch('/api/analytics/summary');
        const data = await response.json();
        
        document.getElementById('totalCredits').textContent = formatCurrency(data.total_credits);
        document.getElementById('totalDebits').textContent = formatCurrency(data.total_debits);
        document.getElementById('netBalance').textContent = formatCurrency(data.net_balance);
        document.getElementById('totalTransactions').textContent = data.total_transactions.toLocaleString();
        document.getElementById('avgTransaction').textContent = formatCurrency(data.average_transaction);
        document.getElementById('uniqueAccounts').textContent = data.unique_accounts;
        
        // Update net balance color
        const netBalanceEl = document.getElementById('netBalance');
        if (data.net_balance >= 0) {
            netBalanceEl.classList.remove('amount-negative');
            netBalanceEl.classList.add('amount-positive');
        } else {
            netBalanceEl.classList.remove('amount-positive');
            netBalanceEl.classList.add('amount-negative');
        }
    } catch (error) {
        console.error('Error loading summary:', error);
    }
}

// Load timeline data
async function loadTimeline() {
    try {
        const response = await fetch('/api/analytics/timeline');
        const data = await response.json();
        
        const labels = data.map(item => formatTimestamp(item.timestamp));
        const credits = data.map(item => item.credits);
        const debits = data.map(item => item.debits);
        
        timelineChart.data.labels = labels;
        timelineChart.data.datasets[0].data = credits;
        timelineChart.data.datasets[1].data = debits;
        timelineChart.update();
    } catch (error) {
        console.error('Error loading timeline:', error);
    }
}

// Load type distribution
async function loadTypeDistribution() {
    try {
        const response = await fetch('/api/analytics/type-distribution');
        const data = await response.json();
        
        typeChart.data.datasets[0].data = [data.credit, data.debit];
        typeChart.update();
    } catch (error) {
        console.error('Error loading type distribution:', error);
    }
}

// Load account data
async function loadAccountData() {
    try {
        const response = await fetch('/api/analytics/by-account');
        const data = await response.json();
        
        const labels = data.map(item => item.account);
        const credits = data.map(item => item.credits);
        const debits = data.map(item => item.debits);
        const balances = data.map(item => item.balance);
        
        accountChart.data.labels = labels;
        accountChart.data.datasets[0].data = credits;
        accountChart.data.datasets[1].data = debits;
        accountChart.data.datasets[2].data = balances;
        accountChart.update();
    } catch (error) {
        console.error('Error loading account data:', error);
    }
}

// Load recent transactions
async function loadRecentTransactions() {
    try {
        const response = await fetch('/api/analytics/recent?limit=15');
        const data = await response.json();
        
        const tbody = document.querySelector('#recentTransactions tbody');
        
        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="no-data">No transactions found</td></tr>';
            return;
        }
        
        tbody.innerHTML = data.map(tx => `
            <tr>
                <td>${tx.id}</td>
                <td><strong>${tx.account}</strong></td>
                <td>
                    <span class="type-badge type-${tx.type}">${tx.type}</span>
                </td>
                <td class="${tx.type === 'credit' ? 'amount-positive' : 'amount-negative'}">
                    ${tx.type === 'credit' ? '+' : '-'}${formatCurrency(tx.amount)}
                </td>
                <td>${formatFullTimestamp(tx.timestamp)}</td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading recent transactions:', error);
    }
}

// Utility functions
function formatCurrency(amount) {
    return '$' + Math.abs(amount).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatFullTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

function updateLastUpdated() {
    const now = new Date();
    document.getElementById('lastUpdated').textContent = now.toLocaleTimeString('en-US');
}
