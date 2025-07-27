// This script will handle the logic for the referral screen (ref.html content)
// It's kept separate from main.js to modularize the code as requested.

const referralLinkInput = document.getElementById('referral-link-input');
const copyRefLinkButton = document.getElementById('copy-ref-link-button');
const refCountEl = document.getElementById('ref-count');
const refBonusDisplayEl = document.getElementById('ref-bonus-display');
const friendsListEl = document.getElementById('friends-list');

function showNotification(message, duration = 4000) {
    const notificationContainer = document.getElementById('notification-container');
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    notificationContainer.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, duration);
}

function generateReferralLink(userId) {
    if (!userId) return "Loading...";
    return `${window.location.origin}${window.location.pathname}?ref=${userId}`;
}

export function updateReferralUI(state) {
    if (!document.getElementById('referral-screen') || document.getElementById('referral-screen').style.display === 'none') {
        return; // Don't update if not visible
    }

    const link = generateReferralLink(state.userId);
    if(referralLinkInput) referralLinkInput.textContent = link;
    if(refCountEl) refCountEl.textContent = state.referrals;
    
    const bonus = state.referrals * 5;
    if(refBonusDisplayEl) refBonusDisplayEl.textContent = `+${bonus}%`;

    // Dummy friends list for now, as we don't have a backend to fetch real friend data.
    if(friendsListEl) {
        friendsListEl.innerHTML = ''; // Clear list
        if (state.referrals === 0) {
            friendsListEl.innerHTML = '<p style="color: #888; text-align: center;">You have not referred any friends yet.</p>';
        } else {
             for (let i = 0; i < state.referrals; i++) {
                const friendEl = document.createElement('li');
                friendEl.innerHTML = `
                    <div class="dp">F${i+1}</div>
                    <h2>Friend ${i+1} <span>+5% Bonus</span></h2>
                `;
                friendsListEl.appendChild(friendEl);
            }
        }
    }
}


function setupReferralEventListeners(state) {
    if (copyRefLinkButton) {
        copyRefLinkButton.addEventListener('click', () => {
            const link = generateReferralLink(state.userId);
            navigator.clipboard.writeText(link).then(() => {
                showNotification('Invite link copied!');
            }, (err) => {
                showNotification('Failed to copy link.');
                console.error('Could not copy text: ', err);
            });
        });
    }
}

// Initialize listeners
// We need to get the state from main.js. This is a bit tricky with modules.
// A simple way is to have main.js call an init function from here.
export function initReferralSystem(state) {
    setupReferralEventListeners(state);
    updateReferralUI(state);
}