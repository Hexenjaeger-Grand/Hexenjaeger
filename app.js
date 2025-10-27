// Modernes Datenmanagement für Hexenjäger
class HexenjaegerDB {
    constructor() {
        this.init();
    }

    init() {
        if (!localStorage.getItem('hexenjaeger_members')) {
            this.saveMembers([
                { id: 'HJ001', name: 'Malachi', joined: new Date().toISOString() },
                { id: 'HJ002', name: 'Raven', joined: new Date().toISOString() },
                { id: 'HJ003', name: 'Orion', joined: new Date().toISOString() }
            ]);
        }
        if (!localStorage.getItem('hexenjaeger_payouts')) {
            this.savePayouts([]);
        }
        if (!localStorage.getItem('hexenjaeger_stats')) {
            this.saveStats([]);
        }
        if (!localStorage.getItem('hexenjaeger_event_history')) {
            this.saveEventHistory([]);
        }
        if (!localStorage.getItem('hexenjaeger_events')) {
            this.saveEvents([]);
        }
        if (!localStorage.getItem('hexenjaeger_completed_payouts')) {
            this.saveCompletedPayouts([]);
        }
        if (!localStorage.getItem('hexenjaeger_event_prices')) {
            this.saveEventPrices({
                'bizwar_win': { price: 50000, description: 'Pro Kill (Win)', unit: 'pro Kill' },
                'bizwar_lose': { price: 25000, description: 'Pro Kill (Lose)', unit: 'pro Kill' },
                '40er_win': { price: 40000, description: 'Pro Kill (Win)', unit: 'pro Kill' },
                '40er_lose': { price: 20000, description: 'Pro Kill (Lose)', unit: 'pro Kill' },
                'giesserei': { price: 30000, description: 'Pro Kill', unit: 'pro Kill' },
                'waffenfabrik': { price: 35000, description: 'Pro Kill', unit: 'pro Kill' },
                'hafen': { price: 100000, description: 'Pro Drop', unit: 'pro Drop' },
                'ekz': { price: 150000, description: 'Pro Win', unit: 'pro Win' }
            });
        }
    }

    getMembers() {
        return JSON.parse(localStorage.getItem('hexenjaeger_members') || '[]');
    }

    saveMembers(members) {
        localStorage.setItem('hexenjaeger_members', JSON.stringify(members));
    }

    addMember(name, id) {
        const members = this.getMembers();
        if (members.find(m => m.id === id)) {
            return { error: 'Mitglied mit dieser ID existiert bereits' };
        }
        members.push({ name, id, joined: new Date().toISOString() });
        this.saveMembers(members);
        return { success: true };
    }

    updateMember(id, newName) {
        const members = this.getMembers();
        const memberIndex = members.findIndex(m => m.id === id);
        
        if (memberIndex === -1) {
            return { error: 'Mitglied nicht gefunden' };
        }
        
        members[memberIndex].name = newName;
        this.saveMembers(members);
        return { success: true };
    }

    deleteMember(id) {
        const members = this.getMembers();
        const memberIndex = members.findIndex(m => m.id === id);
        
        if (memberIndex === -1) {
            return { error: 'Mitglied nicht gefunden' };
        }
        
        const events = this.getEvents();
        const hasEvents = events.some(event => event.memberIds.includes(id));
        
        if (hasEvents) {
            return { error: 'Mitglied kann nicht gelöscht werden, da es Events hat' };
        }
        
        members.splice(memberIndex, 1);
        this.saveMembers(members);
        return { success: true };
    }

    getPayouts() {
        return JSON.parse(localStorage.getItem('hexenjaeger_payouts') || '[]');
    }

    savePayouts(payouts) {
        localStorage.setItem('hexenjaeger_payouts', JSON.stringify(payouts));
    }

    getCompletedPayouts() {
        return JSON.parse(localStorage.getItem('hexenjaeger_completed_payouts') || '[]');
    }

    saveCompletedPayouts(payouts) {
        localStorage.setItem('hexenjaeger_completed_payouts', JSON.stringify(payouts));
    }

    getEventHistory() {
        return JSON.parse(localStorage.getItem('hexenjaeger_event_history') || '[]');
    }

    saveEventHistory(history) {
        localStorage.setItem('hexenjaeger_event_history', JSON.stringify(history));
    }

    getEvents() {
        return JSON.parse(localStorage.getItem('hexenjaeger_events') || '[]');
    }

    saveEvents(events) {
        localStorage.setItem('hexenjaeger_events', JSON.stringify(events));
    }

    addEvent(eventData) {
        try {
            const events = this.getEvents();
            const newEvent = {
                id: Date.now().toString(),
                ...eventData,
                date: new Date().toISOString()
            };
            
            events.push(newEvent);
            this.saveEvents(events);
            this.addEventToHistory(eventData);
            
            let calculatedAmount = 0;
            if (['cayo', 'rp_fabrik', 'ekz'].includes(eventData.eventType)) {
                calculatedAmount = eventData.totalAmount || 0;
            } else {
                calculatedAmount = this.getEventPrice(eventData.eventType, eventData.amount || 1);
            }
            
            return {
                success: true,
                calculatedAmount: calculatedAmount
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    addEventToHistory(eventData) {
        const { eventType, memberIds, amount, totalAmount } = eventData;
        const members = this.getMembers();
        const eventHistory = this.getEventHistory();
        const timestamp = new Date().toISOString();

        memberIds.forEach(memberId => {
            const member = members.find(m => m.id === memberId);
            if (!member) return;

            let individualAmount = 0;
            if (eventType === 'cayo' || eventType === 'rp_fabrik' || eventType === 'ekz') {
                individualAmount = totalAmount > 0 ? Math.round(totalAmount / memberIds.length) : 0;
            } else {
                individualAmount = this.getEventPrice(eventType, amount || 1);
            }

            const eventEntry = {
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                memberId: member.id,
                memberName: member.name,
                eventType: eventType,
                amount: parseInt(amount) || 1,
                totalAmount: totalAmount || 0,
                individualAmount: individualAmount,
                timestamp: timestamp,
                date: new Date().toLocaleDateString('de-DE')
            };
            eventHistory.push(eventEntry);
        });

        this.saveEventHistory(eventHistory);
    }

    getEventPrices() {
        const prices = localStorage.getItem('hexenjaeger_event_prices');
        if (prices) {
            return JSON.parse(prices);
        } else {
            return {};
        }
    }

    saveEventPrices(prices) {
        localStorage.setItem('hexenjaeger_event_prices', JSON.stringify(prices));
    }

    getEventPrice(eventType, amount = 1) {
        const prices = this.getEventPrices();
        const eventPrice = prices[eventType];
        if (eventPrice && eventPrice.price) {
            return eventPrice.price * amount;
        }
        return 0;
    }

    addEventWithHistory(eventData) {
        const result = this.addEvent(eventData);
        return { 
            success: result.success, 
            calculatedAmount: result.calculatedAmount,
            payoutEntries: [] 
        };
    }

    getMemberEventHistory(memberId) {
        const history = this.getEventHistory();
        return history
            .filter(event => event.memberId === memberId)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    formatEventDetails(event) {
        const eventNames = {
            'bizwar_win': 'Bizwar (Win)',
            'bizwar_lose': 'Bizwar (Lose)', 
            '40er_win': '40er (Win)',
            '40er_lose': '40er (Lose)',
            'ekz': 'EKZ (Win)',
            'hafen': 'Hafen Drop',
            'giesserei': 'Gießerei Kill',
            'waffenfabrik': 'Waffenfabrik Kill',
            'cayo': 'Cayo Perico Drop',
            'rp_fabrik': 'RP Fabrik (Win)'
        };

        const eventName = eventNames[event.eventType] || event.eventType;
        
        if (event.eventType === 'cayo') {
            return `${event.amount} Cayo Drops`;
        } else if (event.eventType === 'rp_fabrik') {
            return `${event.amount} RP Fabrik (Win)`;
        } else {
            return `${event.amount} Kills ${eventName}`;
        }
    }
    
    completePayout(memberId) {
        const events = this.getEvents();
        const completedPayouts = this.getCompletedPayouts();
        
        let totalAmount = 0;
        const memberEvents = events.filter(event => event.memberIds.includes(memberId));
        
        memberEvents.forEach(event => {
            const eventType = event.eventType;
            const amount = event.amount || 1;
            const totalAmountEvent = event.totalAmount || 0;
            
            let calculatedAmount = 0;
            if (['cayo', 'rp_fabrik', 'ekz'].includes(eventType)) {
                calculatedAmount = totalAmountEvent > 0 ? Math.round(totalAmountEvent / event.memberIds.length) : 0;
            } else {
                calculatedAmount = this.getEventPrice(eventType, amount);
            }
            
            totalAmount += calculatedAmount;
        });
        
        const member = this.getMembers().find(m => m.id === memberId);
        if (member && totalAmount > 0) {
            completedPayouts.push({
                memberId: memberId,
                memberName: member.name,
                total: totalAmount,
                completedDate: new Date().toISOString()
            });
            
            this.saveCompletedPayouts(completedPayouts);
            const updatedEvents = events.filter(event => !event.memberIds.includes(memberId));
            this.saveEvents(updatedEvents);
            
            return { success: true, amount: totalAmount };
        }
        
        return { error: 'Mitglied nicht gefunden oder kein Betrag vorhanden' };
    }

    completeAllPayouts() {
        const payouts = this.getPayouts();
        const stats = this.getStats();
        
        payouts.forEach(payout => {
            payout.paidDate = new Date().toISOString();
            stats.push(payout);
        });
        
        this.saveStats(stats);
        this.savePayouts([]);
        return { success: true, completed: payouts.length };
    }

    getStats() {
        return JSON.parse(localStorage.getItem('hexenjaeger_stats') || '[]');
    }

    saveStats(stats) {
        localStorage.setItem('hexenjaeger_stats', JSON.stringify(stats));
    }
}

// Auth Configuration
const AUTH_CONFIG = {
    authUrl: 'http://168.119.73.121:3000/auth/discord',
    verifyUrl: 'http://168.119.73.121:3000/auth/verify'
};

// Auth State Management - FIXED VERSION
class AuthManager {
    constructor() {
        this.token = null;
        this.userInfo = null;
    }

    async init() {
        // Token aus URL holen
        const urlParams = new URLSearchParams(window.location.search);
        const tokenFromURL = urlParams.get('token');
        
        if (tokenFromURL) {
            this.token = tokenFromURL;
            localStorage.setItem('discord_token', this.token);
            // URL bereinigen
            window.history.replaceState({}, '', window.location.pathname);
        } else {
            // Token aus localStorage laden
            this.token = localStorage.getItem('discord_token');
        }

        if (this.token) {
            const success = await this.verifyAndApplyPermissions();
            if (!success) {
                this.showLoginScreen();
            }
        } else {
            this.showLoginScreen();
        }
    }

    async verifyAndApplyPermissions() {
        try {
            const response = await fetch(AUTH_CONFIG.verifyUrl, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Server error');
            }
            
            this.userInfo = await response.json();
            
            if (this.userInfo.authenticated) {
                this.hideLoginScreen();
                this.applyPermissions(this.userInfo.fullAccess);
                this.showUserInfo();
                return true;
            } else {
                this.logout();
                return false;
            }
        } catch (error) {
            console.error('Auth verification failed:', error);
            this.logout();
            return false;
        }
    }

    hideLoginScreen() {
        const loginOverlays = document.querySelectorAll('.login-overlay');
        loginOverlays.forEach(overlay => overlay.remove());
    }

    applyPermissions(hasFullAccess) {
        // Navigation anpassen
        if (!hasFullAccess) {
            const restrictedTabs = document.querySelectorAll('a[href="eingabe.html"], a[href="mitglieder.html"]');
            restrictedTabs.forEach(tab => {
                if (tab.parentElement) {
                    tab.parentElement.style.display = 'none';
                } else {
                    tab.style.display = 'none';
                }
            });
        }

        // Seiten-spezifische Elemente anpassen
        this.admitPageElements(hasFullAccess);
    }

    showLoginScreen() {
        this.hideLoginScreen();
        
        const loginOverlay = document.createElement('div');
        loginOverlay.className = 'login-overlay';
        loginOverlay.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: var(--bg-dark); z-index: 10000; display: flex; flex-direction: column; justify-content: center; align-items: center; color: white;">
                <h1>Hexenjäger Family</h1>
                <p style="margin-bottom: 20px;">Bitte mit Discord authentifizieren</p>
                <button onclick="auth.login()" class="btn btn-primary" style="font-size: 16px; padding: 12px 24px;">
                    🔐 Mit Discord anmelden
                </button>
            </div>
        `;
        document.body.appendChild(loginOverlay);
    }

    login() {
        window.location.href = AUTH_CONFIG.authUrl;
    }

    logout() {
        localStorage.removeItem('discord_token');
        this.token = null;
        this.userInfo = null;
        this.showLoginScreen();
    }

    admitPageElements(hasFullAccess) {
        const currentPage = window.location.pathname.split('/').pop();
        
        switch(currentPage) {
            case 'auszahlungen.html':
                if (!hasFullAccess) {
                    const buttons = document.querySelectorAll('button');
                    buttons.forEach(btn => {
                        if (btn.textContent.includes('Neues Event erfassen') || 
                            btn.onclick && btn.onclick.toString().includes('eingabe.html')) {
                            btn.style.display = 'none';
                        }
                    });
                    
                    const thElements = document.querySelectorAll('th');
                    thElements.forEach(th => {
                        if (th.textContent.includes('Aktionen')) {
                            th.style.display = 'none';
                        }
                    });
                    
                    const tdElements = document.querySelectorAll('td');
                    tdElements.forEach((td, index) => {
                        const tr = td.closest('tr');
                        if (tr) {
                            const tds = tr.querySelectorAll('td');
                            if (tds.length > 0 && td === tds[tds.length - 1]) {
                                td.style.display = 'none';
                            }
                        }
                    });
                }
                break;
                
            case 'statistik.html':
                if (!hasFullAccess) {
                    const resetBtns = document.querySelectorAll('.reset-btn, button[onclick*="reset"]');
                    resetBtns.forEach(btn => btn.style.display = 'none');
                }
                break;
                
            case 'eingabe.html':
            case 'mitglieder.html':
                if (!hasFullAccess) {
                    window.location.href = 'index.html';
                }
                break;
        }
    }

    showUserInfo() {
        const header = document.querySelector('header');
        if (header && this.userInfo) {
            let userInfoElement = header.querySelector('.user-info');
            if (!userInfoElement) {
                userInfoElement = document.createElement('div');
                userInfoElement.className = 'user-info';
                userInfoElement.style.cssText = `
                    position: absolute;
                    top: 20px;
                    right: 20px;
                    background: var(--bg-card);
                    padding: 8px 16px;
                    border-radius: 6px;
                    border: 1px solid var(--border-color);
                    font-size: 14px;
                `;
                header.style.position = 'relative';
                header.appendChild(userInfoElement);
            }
            
            const accessLevel = this.userInfo.fullAccess ? 'Admin' : 'Mitglied';
            userInfoElement.innerHTML = `
                <div>👤 ${this.userInfo.user}</div>
                <div style="font-size: 12px; color: var(--text-muted);">${accessLevel}</div>
                <button onclick="auth.logout()" style="background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 12px; margin-top: 4px;">
                    Abmelden
                </button>
            `;
        }
    }
}

// Globale DB Instanz
const db = new HexenjaegerDB();

// Globale Auth Instanz
const auth = new AuthManager();

// Hilfsfunktionen
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatCurrency(amount) {
    return '$' + parseInt(amount).toLocaleString('de-DE');
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#6366f1'};
        color: white;
        border-radius: 6px;
        z-index: 10000;
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 4000);
}

// Auto-Init für Auth
document.addEventListener('DOMContentLoaded', async function() {
    await auth.init();
});
