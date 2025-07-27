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

// Ad button
const watchAdButton = document.getElementById('watch-ad-button');

const withdrawButton = document.getElementById('withdraw-button');
const withdrawModal = document.getElementById('withdraw-modal');
const modalClose = document.getElementById('modal-close');
const notificationContainer = document.getElementById('notification-container');

// Offline Earnings Elements
const offlineEarningsModal = document.getElementById('offline-earnings-modal');
const offlineModalClose = document.getElementById('offline-modal-close');
const claimOfflineEarningsButton = document.getElementById('claim-offline-earnings');
const offlineMilkEarnedEl = document.getElementById('offline-milk-earned');

// Withdraw Form Elements
const withdrawForm = document.getElementById('withdraw-form');
const tonAddressInput = document.getElementById('ton-address');
const withdrawAmountInput = document.getElementById('withdraw-amount');
const submitWithdrawButton = document.getElementById('submit-withdraw');

// --- GAME STATE ---
const state = {
    milk: 0,
    cowCoin: 0,
    lastUpdate: Date.now(),
    swapCost: 50000,
    baseRate: 0.5,
    upgrades: {
        quality: { level: 1, multiplier: 1, baseCost: 100, costGrowth: 2.0, effect: 0.10, el: document.getElementById('upgrade-quality') },
        count: { level: 1, multiplier: 1, baseCost: 250, costGrowth: 2.1, effect: 0.20, el: document.getElementById('upgrade-count') },
        happiness: { level: 1, multiplier: 1, baseCost: 500, costGrowth: 2.2, effect: 0.30, el: document.getElementById('upgrade-happiness') }
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
        lastUpdate: state.lastUpdate,
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
        state.lastUpdate = savedState.lastUpdate || Date.now();

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

// Offline earnings calculation
function calculateOfflineEarnings() {
    const now = Date.now();
    const timeDiffSeconds = Math.floor((now - state.lastUpdate) / 1000);
    state.lastUpdate = now; // Update timestamp immediately

    if (timeDiffSeconds <= 10) return; // Ignore short periods

    // Cap offline time to 2 hours (7200 seconds)
    const effectiveTime = Math.min(timeDiffSeconds, 7200);
    const milkPerSecond = calculateMilkPerSecond();
    const offlineMilk = effectiveTime * milkPerSecond;

    if (offlineMilk > 0) {
        offlineMilkEarnedEl.textContent = formatNumber(offlineMilk, true);
        offlineEarningsModal.style.display = 'flex';
        
        claimOfflineEarningsButton.onclick = () => {
            state.milk += offlineMilk;
            offlineEarningsModal.style.display = 'none';
            showNotification(`+${formatNumber(offlineMilk, true)} süt toplandı!`);
            updateAllUI();
        };
    }
}

// Function to handle ad logic
function triggerAd() {
    if (typeof window.showGiga !== 'function') {
        showNotification("Reklamlar henüz hazır değil. Lütfen biraz bekleyin.");
        console.warn('Attempted to show ad before window.showGiga was ready.');
        return;
    }

    // Disable button to prevent multiple clicks
    watchAdButton.disabled = true;

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

async function handleWithdrawal(event) {
    event.preventDefault();
    submitWithdrawButton.disabled = true;
    submitWithdrawButton.textContent = "Gönderiliyor...";

    const amount = parseInt(withdrawAmountInput.value, 10);
    const address = tonAddressInput.value.trim();
    const webhookURL = "https://eos5yjgvkh1gbmh.m.pipedream.net";

    if (!address) {
        showNotification("Lütfen geçerli bir TON adresi girin.");
        submitWithdrawButton.disabled = false;
        submitWithdrawButton.textContent = "Çekim Talebi Oluştur";
        return;
    }

    if (isNaN(amount) || amount <= 0) {
        showNotification("Lütfen geçerli bir miktar girin.");
        submitWithdrawButton.disabled = false;
        submitWithdrawButton.textContent = "Çekim Talebi Oluştur";
        return;
    }

    if (amount < 100) {
        showNotification("Minimum çekim miktarı 100 $COW'dur.");
        submitWithdrawButton.disabled = false;
        submitWithdrawButton.textContent = "Çekim Talebi Oluştur";
        return;
    }

    if (state.cowCoin < amount) {
        showNotification("Yetersiz $COW bakiyesi!");
        submitWithdrawButton.disabled = false;
        submitWithdrawButton.textContent = "Çekim Talebi Oluştur";
        return;
    }

    // Optimistically subtract the amount
    state.cowCoin -= amount;
    updateAllUI();

    try {
        const response = await fetch(webhookURL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                ton_address: address,
                amount: amount
            }),
        });

        if (!response.ok) {
            throw new Error(`Webhook failed with status: ${response.status}`);
        }

        // Success
        console.log(`Withdrawal Request Sent: ${amount} $COW to ${address}`);
        showNotification(`${amount} $COW çekim talebiniz başarıyla alındı!`);
        withdrawModal.style.display = 'none';
        withdrawForm.reset();
        saveState();

    } catch (error) {
        console.error("Webhook submission failed:", error);
        showNotification("Çekim talebi gönderilemedi. Lütfen tekrar deneyin.");
        // Revert the state if the request failed
        state.cowCoin += amount;
        updateAllUI();
    } finally {
        submitWithdrawButton.disabled = false;
        submitWithdrawButton.textContent = "Çekim Talebi Oluştur";
    }
}

// Swap milk for $COW
function swapMilkForCow() {
    if (state.milk >= state.swapCost) {
        state.milk -= state.swapCost;
        state.cowCoin += 1;
        updateAllUI();
        audioManager.playSound('upgrade');
        showNotification(`1 $COW aldınız!`);
    }
}

// Buy an upgrade
function buyUpgrade(upgradeName) {
    const upgrade = state.upgrades[upgradeName];
    const cost = calculateCost(upgrade); // Always calculate the latest cost
    if (state.milk >= cost) { 
        state.milk -= cost;
        upgrade.level++;
        upgrade.multiplier = 1 + (upgrade.level - 1) * upgrade.effect; // Recalculate multiplier
        updateAllUI();
        audioManager.playSound('upgrade');
    }
}

// Calculate the cost of an upgrade
function calculateCost(upgrade) {
    // This creates an infinitely scaling cost.
    return Math.floor(upgrade.baseCost * Math.pow(upgrade.costGrowth, upgrade.level - 1));
}

// --- UI RENDERING ---

// Show a temporary notification message
function showNotification(message, duration = 4000) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    notificationContainer.appendChild(notification);

    // Remove the notification after the animation ends or the specified duration
    setTimeout(() => {
        notification.remove();
    }, duration);
}

// Format large numbers
function formatNumber(num, isInteger = false) {
    const roundFunc = isInteger ? Math.floor : (n) => n.toFixed(2);
    if (num < 1000) return isInteger ? Math.floor(num) : num.toFixed(2);
    const suffixes = ["", "k", "M", "B", "T", "P", "E"];
    const i = Math.floor(Math.log10(num) / 3);
    if (i >= suffixes.length) return num.toExponential(2);
    const scaledNum = num / Math.pow(1000, i);
    return (isInteger ? Math.floor(scaledNum) : scaledNum.toFixed(2)) + suffixes[i];
}

// Update all UI elements
function updateAllUI() {
    // Update milk totals
    milkTotalEl.textContent = formatNumber(state.milk);
    cowCoinTotalEl.textContent = formatNumber(state.cowCoin, true);
    milkRateEl.textContent = formatNumber(calculateMilkPerSecond());

    // Update all upgrade cards
    for (const key in state.upgrades) {
        const upgrade = state.upgrades[key];
        upgrade.cost = calculateCost(upgrade);

        const levelEl = upgrade.el.querySelector('.level');
        const costEl = upgrade.el.querySelector('.cost');
        const buttonEl = upgrade.el.querySelector('button');

        levelEl.textContent = upgrade.level;
        costEl.textContent = formatNumber(upgrade.cost, true);
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

    // Withdraw form submission
    withdrawForm.addEventListener('submit', handleWithdrawal);

    // Offline earnings modal
    offlineModalClose.addEventListener('click', () => {
        offlineEarningsModal.style.display = 'none';
    });
    
    // Ad button listener (in the upgrades section)
    watchAdButton.addEventListener('click', triggerAd);
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
        calculateOfflineEarnings(); // Check for offline progress
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