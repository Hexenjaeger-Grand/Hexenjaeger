// Modernes Datenmanagement für Hexenjäger
class HexenjaegerDB {
    constructor() {
        this.init();
    }

    init() {
        // Initialisiere Standarddaten
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
    }

    // Mitglieder Management
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

    // Auszahlungen Management
    getPayouts() {
        return JSON.parse(localStorage.getItem('hexenjaeger_payouts') || '[]');
    }

    savePayouts(payouts) {
        localStorage.setItem('hexenjaeger_payouts', JSON.stringify(payouts));
    }

    // Event History für Details
    getEventHistory() {
        return JSON.parse(localStorage.getItem('hexenjaeger_event_history') || '[]');
    }

    saveEventHistory(history) {
        localStorage.setItem('hexenjaeger_event_history', JSON.stringify(history));
    }

    // Events Management
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
            
            // Für individuelle Events berechnen wir den Betrag hier
            let calculatedAmount = 0;
            if (['cayo', 'rp_fabrik', 'ekz'].includes(eventData.eventType)) {
                // Shared Events
                calculatedAmount = eventData.totalAmount || 0;
            } else {
                // Individuelle Events
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

    // Event Preise
    getEventPrices() {
        const prices = localStorage.getItem('hexenjaeger_event_prices');
        if (prices) {
            return JSON.parse(prices);
        } else {
            // Leere Preise zurückgeben, da sie in der Event-Eingabe gesetzt werden
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
        return 0; // Fallback, falls kein Preis gesetzt ist
    }

    // Event hinzufügen - MIT HISTORY
    addEventWithHistory(eventData) {
        const { eventType, memberIds, amount, totalAmount } = eventData;
        const members = this.getMembers();
        const payouts = this.getPayouts();
        const eventHistory = this.getEventHistory();
        
        let calculatedAmount = 0;
        let payoutEntries = [];
        const timestamp = new Date().toISOString();

        // Für jedes Mitglied erstellen/updaten wir einen Eintrag
        memberIds.forEach(memberId => {
            const member = members.find(m => m.id === memberId);
            if (!member) return;

            let payout = payouts.find(p => p.memberId === memberId);
            if (!payout) {
                payout = {
                    memberId,
                    memberName: member.name,
                    bizwar_win: 0, bizwar_lose: 0,
                    '40er_win': 0, '40er_lose': 0,
                    giesserei: 0, waffenfabrik: 0,
                    hafen: 0, cayo: 0, rp_fabrik: 0, ekz: 0,
                    total: 0
                };
                payouts.push(payout);
            }

            // Berechne Betrag basierend auf Event-Typ
            let individualAmount = 0;
            if (eventType === 'cayo' || eventType === 'rp_fabrik') {
                individualAmount = Math.round(totalAmount / memberIds.length);
                payout[eventType] += parseInt(amount);
                payout.total += individualAmount;
                calculatedAmount += individualAmount;
            } else {
                individualAmount = this.getEventPrice(eventType, amount);
                payout[eventType] += parseInt(amount);
                payout.total += individualAmount;
                calculatedAmount += individualAmount;
            }

            // Event zur History hinzufügen
            const eventEntry = {
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                memberId: member.id,
                memberName: member.name,
                eventType: eventType,
                amount: parseInt(amount),
                totalAmount: eventType === 'cayo' || eventType === 'rp_fabrik' ? totalAmount : individualAmount,
                individualAmount: individualAmount,
                timestamp: timestamp,
                date: new Date().toLocaleDateString('de-DE')
            };
            eventHistory.push(eventEntry);

            payoutEntries.push({
                memberId: member.id,
                memberName: member.name,
                amount: individualAmount
            });
        });

        this.savePayouts(payouts);
        this.saveEventHistory(eventHistory);
        return { 
            success: true, 
            calculatedAmount,
            payoutEntries 
        };
    }

    // Event History für ein Mitglied abrufen
    getMemberEventHistory(memberId) {
        const history = this.getEventHistory();
        return history
            .filter(event => event.memberId === memberId)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    // Event Details als Text formatieren
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
    
    // Auszahlung abschließen
    completePayout(memberId) {
        const payouts = this.getPayouts();
        const stats = this.getStats();
        const eventHistory = this.getEventHistory();
        
        const payoutIndex = payouts.findIndex(p => p.memberId === memberId);
        if (payoutIndex !== -1) {
            const completedPayout = payouts[payoutIndex];
            completedPayout.paidDate = new Date().toISOString();
            
            stats.push(completedPayout);
            payouts.splice(payoutIndex, 1);
            
            this.savePayouts(payouts);
            this.saveStats(stats);
            return { success: true };
        }
        return { error: 'Auszahlung nicht gefunden' };
    }

    // Bulk Operationen
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

    // Statistik
    getStats() {
        return JSON.parse(localStorage.getItem('hexenjaeger_stats') || '[]');
    }

    saveStats(stats) {
        localStorage.setItem('hexenjaeger_stats', JSON.stringify(stats));
    }
}

// Globale DB Instanz
const db = new HexenjaegerDB();

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
