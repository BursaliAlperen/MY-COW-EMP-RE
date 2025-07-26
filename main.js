import { audioManager } from './audio.js';

// --- DOM ELEMENTS ---
const loadingScreen = document.getElementById('loading-screen');
const loadingText = document.getElementById('loading-text');
const gameScreen = document.getElementById('game-screen');
const milkTotalEl = document.getElementById('milk-total');
const cowCoinTotalEl = document.getElementById('cow-coin-total');
const milkRateEl = document.getElementById('milk-rate');
const mainCowEl = document.getElementById('main-cow');
const milkSplashEl = document.getElementById('milk-splash');

const swapButton = document.getElementById('swap-button');
const topAdButton = document.getElementById('top-ad-button'); // New ad button

// Ad button
const watchAdButton = document.getElementById('watch-ad-button');

const withdrawButton = document.getElementById('withdraw-button');
const withdrawModal = document.getElementById('withdraw-modal');
const modalClose = document.getElementById('modal-close');
const notificationContainer = document.getElementById('notification-container');

// --- GAME STATE ---
const state = {
    milk: 0,
    cowCoin: 0,
    swapCost: 50000,
    baseRate: 0.5,
    upgrades: {
        quality: { level: 1, multiplier: 1, baseCost: 100, costGrowth: 1.15, effect: 0.05, el: document.getElementById('upgrade-quality') },
        count: { level: 1, multiplier: 1, baseCost: 250, costGrowth: 1.18, effect: 0.1, el: document.getElementById('upgrade-count') },
        happiness: { level: 1, multiplier: 1, baseCost: 500, costGrowth: 1.22, effect: 0.15, el: document.getElementById('upgrade-happiness') }
    }
};

// --- ADVERTISEMENT SERVICE ---
function initAdService() {
    // The new ad script loads asynchronously. 
    // We'll check for window.showGiga in the triggerAd function directly.
    console.log("Ad service will be checked upon ad request.");
}

// --- SAVE & LOAD ---
function saveState() {
    const stateToSave = {
        milk: state.milk,
        cowCoin: state.cowCoin,
        upgrades: {
            quality: { level: state.upgrades.quality.level },
            count: { level: state.upgrades.count.level },
            happiness: { level: state.upgrades.happiness.level }
        }
    };
    localStorage.setItem('myCowEmpireState', JSON.stringify(stateToSave));
}

function loadState() {
    const savedStateJSON = localStorage.getItem('myCowEmpireState');
    if (savedStateJSON) {
        const savedState = JSON.parse(savedStateJSON);
        
        state.milk = savedState.milk || 0;
        state.cowCoin = savedState.cowCoin || 0;

        if (savedState.upgrades) {
            state.upgrades.quality.level = savedState.upgrades.quality?.level || 1;
            state.upgrades.count.level = savedState.upgrades.count?.level || 1;
            state.upgrades.happiness.level = savedState.upgrades.happiness?.level || 1;
        }
        
        recalculateMultipliers();
    }
}

function recalculateMultipliers() {
    for (const key in state.upgrades) {
        const upgrade = state.upgrades[key];
        upgrade.multiplier = 1 + (upgrade.level - 1) * upgrade.effect;
    }
}

// --- GAME LOGIC ---

// Calculate milk production per second
function calculateMilkPerSecond() {
    const { baseRate, upgrades } = state;
    const { quality, count, happiness } = upgrades;
    return baseRate * quality.multiplier * count.multiplier * happiness.multiplier;
}

// Function to handle ad logic
function triggerAd() {
    if (typeof window.showGiga !== 'function') {
        showNotification("Reklamlar henüz hazır değil. Lütfen biraz bekleyin.");
        console.warn('Attempted to show ad before window.showGiga was ready.');
        return;
    }

    // Disable buttons to prevent multiple clicks
    watchAdButton.disabled = true;
    topAdButton.disabled = true;

    window.showGiga()
        .then(() => {
            // Success! User watched the ad.
            const reward = Math.floor(Math.random() * 50) + 1; // Reward between 1 and 50
            state.cowCoin += reward;
            audioManager.playSound('upgrade');
            showNotification(`Tebrikler! ${reward} $COW kazandınız!`);
            updateAllUI();
        })
        .catch((err) => {
            // Handle cases where the ad wasn't shown or was skipped
            console.error('Ad display error or skipped:', err);
            showNotification("Reklam tamamlanamadı. Ödül verilmedi.");
        })
        .finally(() => {
            // Re-enable buttons regardless of outcome
            watchAdButton.disabled = false;
            topAdButton.disabled = false;
        });
}

// Produce milk every second
function produceMilk() {
    const milkPerSecond = calculateMilkPerSecond();
    state.milk += milkPerSecond;
    
    // Animate milk splash
    milkSplashEl.textContent = `+${milkPerSecond.toFixed(2)}`;
    milkSplashEl.classList.remove('animate');
    void milkSplashEl.offsetWidth; // Trigger reflow
    milkSplashEl.classList.add('animate');
}

// Swap milk for $COW
function swapMilkForCow() {
    if (state.milk >= state.swapCost) {
        state.milk -= state.swapCost;
        state.cowCoin += 1;
        updateAllUI();
        audioManager.playSound('upgrade');
    }
}

// Buy an upgrade
function buyUpgrade(upgradeName) {
    const upgrade = state.upgrades[upgradeName];
    if (state.milk >= upgrade.cost) { // Check against milk, not cowCoin
        state.milk -= upgrade.cost;
        upgrade.level++;
        upgrade.multiplier = 1 + (upgrade.level - 1) * upgrade.effect; // Recalculate multiplier
        updateAllUI();
        audioManager.playSound('upgrade');
    }
}

// Calculate the cost of an upgrade
function calculateCost(upgrade) {
    return Math.ceil(upgrade.baseCost * Math.pow(upgrade.costGrowth, upgrade.level - 1));
}

// --- UI RENDERING ---

// Show a temporary notification message
function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    notificationContainer.appendChild(notification);

    // Remove the notification after the animation ends
    setTimeout(() => {
        notification.remove();
    }, 4000);
}

// Format large numbers
function formatNumber(num) {
    if (num < 1000) return num.toFixed(2);
    const suffixes = ["", "k", "M", "B", "T"];
    const i = Math.floor(Math.log10(num) / 3);
    return (num / Math.pow(1000, i)).toFixed(2) + suffixes[i];
}

// Update all UI elements
function updateAllUI() {
    // Update milk totals
    milkTotalEl.textContent = formatNumber(state.milk);
    cowCoinTotalEl.textContent = state.cowCoin;
    milkRateEl.textContent = formatNumber(calculateMilkPerSecond());

    // Update all upgrade cards
    for (const key in state.upgrades) {
        const upgrade = state.upgrades[key];
        upgrade.cost = calculateCost(upgrade);

        const levelEl = upgrade.el.querySelector('.level');
        const costEl = upgrade.el.querySelector('.cost');
        const buttonEl = upgrade.el.querySelector('button');

        levelEl.textContent = upgrade.level;
        costEl.textContent = formatNumber(upgrade.cost);
        buttonEl.disabled = state.milk < upgrade.cost;
    }

    // Update swap button state
    swapButton.disabled = state.milk < state.swapCost;
}

// --- EVENT LISTENERS ---
function setupEventListeners() {
    // Upgrade buttons
    for (const key in state.upgrades) {
        const buttonEl = state.upgrades[key].el.querySelector('button');
        buttonEl.addEventListener('click', () => buyUpgrade(key));
    }

    // Swap button
    swapButton.addEventListener('click', swapMilkForCow);
    
    // Main cow click for occasional sound
    mainCowEl.addEventListener('click', () => {
        if(Math.random() < 0.5) { // 50% chance to moo on click
            audioManager.playSound('moo');
        }
    });

    // Modal listeners
    withdrawButton.addEventListener('click', () => {
        withdrawModal.style.display = 'flex';
    });
    modalClose.addEventListener('click', () => {
        withdrawModal.style.display = 'none';
    });
    withdrawModal.addEventListener('click', (e) => {
        if (e.target === withdrawModal) {
            withdrawModal.style.display = 'none';
        }
    });

    // Ad button listeners
    watchAdButton.addEventListener('click', triggerAd);
    topAdButton.addEventListener('click', triggerAd);
}

// --- INITIALIZATION ---
function init() {
    loadState(); // Load saved progress
    initAdService(); // Initialize the new ad service

    // Show loading screen
    setTimeout(() => {
        loadingText.textContent = "Süt doluyor...";
    }, 1500);

    // "Start" the game after a delay
    setTimeout(() => {
        loadingScreen.style.display = 'none';
        gameScreen.style.display = 'flex';
        
        setupEventListeners();
        updateAllUI();
        
        // Start the game loop
        setInterval(() => {
            produceMilk();
            updateAllUI();
        }, 1000);
        
        // Save progress periodically
        setInterval(saveState, 5000);
        
        // Occasional ambient moo sound
        setInterval(() => {
             if(Math.random() < 0.2) { // 20% chance every 10 seconds
                audioManager.playSound('moo');
            }
        }, 10000);

    }, 3000);
}

// Start the game when the window loads
window.addEventListener('load', init);