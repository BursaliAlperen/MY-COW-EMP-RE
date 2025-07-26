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
const referralButton = document.getElementById('referral-button');

// Ad button
const watchAdButton = document.getElementById('watch-ad-button');

const withdrawButton = document.getElementById('withdraw-button');
const withdrawModal = document.getElementById('withdraw-modal');
const modalClose = document.getElementById('modal-close');
const notificationContainer = document.getElementById('notification-container');

// Referral System Elements
const referralModal = document.getElementById('referral-modal');
const referralModalClose = document.getElementById('referral-modal-close');
const referralLinkInput = document.getElementById('referral-link');
const copyRefLinkButton = document.getElementById('copy-ref-link-button');
const refBonusDisplay = document.getElementById('ref-bonus-display');
const referralLinkInputModal = document.getElementById('referral-link-modal');
const copyRefLinkButtonModal = document.getElementById('copy-ref-link-button-modal');
const refBonusDisplayModal = document.querySelector('.ref-bonus-display-modal');

// Offline Earnings Elements
const offlineEarningsModal = document.getElementById('offline-earnings-modal');
const offlineModalClose = document.getElementById('offline-modal-close');
const claimOfflineEarningsButton = document.getElementById('claim-offline-earnings');
const offlineMilkEarnedEl = document.getElementById('offline-milk-earned');

// --- GAME STATE ---
const state = {
    milk: 0,
    cowCoin: 0,
    lastUpdate: Date.now(),
    swapCost: 50000,
    baseRate: 0.5,
    referral: {
        userId: null,
        referralCount: 0, // Number of people this user has referred
        bonusPerReferral: 0.05, // 5% bonus per referral
        referredBy: null, // ID of the user who referred this player
        claimedReferral: false, // Has this user claimed their "referred by" bonus?
    },
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
        referral: state.referral, // Save referral state
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

        if (savedState.referral) {
            state.referral = { ...state.referral, ...savedState.referral };
        }

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
    const { baseRate, upgrades, referral } = state;
    const { quality, count, happiness } = upgrades;
    const referralBonus = 1 + (referral.referralCount * referral.bonusPerReferral);
    return baseRate * quality.multiplier * count.multiplier * happiness.multiplier * referralBonus;
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
    
    // Update referral UI
    if (state.referral.userId) {
        const baseUrl = window.location.origin + window.location.pathname;
        const refLink = `${baseUrl}?ref=${state.referral.userId}`;
        referralLinkInput.value = refLink;
        referralLinkInputModal.value = refLink;
    }
    const bonusPercentage = state.referral.referralCount * state.referral.bonusPerReferral * 100;
    const bonusText = `+${bonusPercentage.toFixed(0)}`;
    refBonusDisplay.textContent = bonusText;
    refBonusDisplayModal.textContent = bonusText;
}

// --- REFERRAL LOGIC ---
function initializeReferralSystem() {
    // 1. Assign a user ID if they don't have one.
    if (!state.referral.userId) {
        // Try to get from Telegram, otherwise generate a random one.
        const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
        state.referral.userId = tgUser ? `tg_${tgUser.id}` : `user_${Date.now()}${Math.random().toString(36).substr(2, 9)}`;
    }

    // 2. Check if the user was referred.
    const urlParams = new URLSearchParams(window.location.search);
    const referrerId = urlParams.get('ref');

    if (referrerId && !state.referral.claimedReferral && referrerId !== state.referral.userId) {
        state.referral.referredBy = referrerId;
        state.referral.claimedReferral = true; // Mark as claimed to prevent re-triggering
        
        // Simulate server-side verification and reward
        showNotification("Referans kodu algılandı, doğrulanıyor...", 2500);
        
        setTimeout(() => {
            state.cowCoin += 50; // Welcome bonus for being referred
            showNotification("Doğrulama başarılı! Arkadaş bonusu olarak 50 $COW kazandın!");
            updateAllUI();
            saveState(); // Save state immediately after reward
        }, 2600);
        
        // This is a placeholder for rewarding the referrer.
        // In a real app, this would be a server call.
        console.log(`User was referred by ${referrerId}. A real app would now notify the server to reward the referrer.`);
        
        // For simulation purposes, we store that a referral happened in local storage.
        // The referrer will get their bonus the next time they open the game.
        localStorage.setItem('pending_referral_for', referrerId);
    }
    
    // Check if this user needs to be rewarded for referring someone.
    const pendingReferral = localStorage.getItem('pending_referral_for');
    if (pendingReferral && pendingReferral === state.referral.userId) {
        state.referral.referralCount++;
        localStorage.removeItem('pending_referral_for'); // Clear the flag
        showNotification("Tebrikler! Bir arkadaşın senin linkinle katıldı! +%5 üretim bonusu kazandın!");
        updateAllUI();
        saveState();
    }
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

    // Offline earnings modal
    offlineModalClose.addEventListener('click', () => {
        offlineEarningsModal.style.display = 'none';
    });
    
    // Referral modal listeners
    referralButton.addEventListener('click', () => {
        referralModal.style.display = 'flex';
    });
    referralModalClose.addEventListener('click', () => {
        referralModal.style.display = 'none';
    });
    referralModal.addEventListener('click', (e) => {
        if (e.target === referralModal) {
            referralModal.style.display = 'none';
        }
    });

    // Ad button listener (in the upgrades section)
    watchAdButton.addEventListener('click', triggerAd);

    // Referral link copy button
    copyRefLinkButton.addEventListener('click', () => {
        referralLinkInput.select();
        document.execCommand('copy');
        showNotification("Referans linki kopyalandı!");
    });
    copyRefLinkButtonModal.addEventListener('click', () => {
        referralLinkInputModal.select();
        document.execCommand('copy');
        showNotification("Referans linki kopyalandı!");
    });
}

// --- INITIALIZATION ---
function init() {
    loadState(); // Load saved progress
    initAdService(); // Initialize the new ad service
    initializeReferralSystem(); // Setup user ID and check for referral

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