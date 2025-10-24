[file name]: app.js
[file content begin]
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

    // Event Preise
    getEventPrice(eventType, amount = 1) {
        const PRICES = {
            'bizwar_win': 20000,
            'bizwar_lose': 10000,
            '40er_win': 40000,
            '40er_lose': 20000,
            'ekz': 80000,
            'hafen': 40000,
            'giesserei': 10000,
            'waffenfabrik': 10000,
            'cayo': 0, // Wird separat berechnet
            'rp_fabrik': 0  // Wird separat berechnet
        };
        return PRICES[eventType] * amount;
    }

    // Event hinzufügen - JETZT MIT MEHREREN MITGLIEDERN
    addEvent(eventData) {
        const { eventType, memberIds, amount, totalAmount } = eventData;
        const members = this.getMembers();
        const payouts = this.getPayouts();
        
        let calculatedAmount = 0;
        let payoutEntries = [];

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
            if (eventType === 'cayo' || eventType === 'rp_fabrik') {
                const individualAmount = Math.round(totalAmount / memberIds.length);
                payout[eventType] += parseInt(amount);
                payout.total += individualAmount;
                calculatedAmount += individualAmount;
            } else {
                const eventAmount = this.getEventPrice(eventType, amount);
                payout[eventType] += parseInt(amount);
                payout.total += eventAmount;
                calculatedAmount += eventAmount;
            }

            payoutEntries.push({
                memberId: member.id,
                memberName: member.name,
                amount: calculatedAmount
            });
        });

        this.savePayouts(payouts);
        return { 
            success: true, 
            calculatedAmount,
            payoutEntries 
        };
    }

    // Auszahlung abschließen
    completePayout(memberId) {
        const payouts = this.getPayouts();
        const stats = this.getStats();
        
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

    // Statistik
    getStats() {
        return JSON.parse(localStorage.getItem('hexenjaeger_stats') || '[]');
    }

    saveStats(stats) {
        localStorage.setItem('hexenjaeger_stats', JSON.stringify(stats));
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
[file content end]
