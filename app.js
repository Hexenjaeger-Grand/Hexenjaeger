// Daten Management
class HexenjaegerDB {
    constructor() {
        this.init();
    }

    init() {
        // Initialisiere Standard-Daten falls nicht vorhanden
        if (!this.getMembers()) {
            this.saveMembers([]);
        }
        if (!this.getPayouts()) {
            this.savePayouts([]);
        }
        if (!this.getStats()) {
            this.saveStats([]);
        }
    }

    // Mitglieder
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
        const member = members.find(m => m.id === id);
        if (member) {
            member.name = newName;
            this.saveMembers(members);
            return { success: true };
        }
        return { error: 'Mitglied nicht gefunden' };
    }

    deleteMember(id) {
        let members = this.getMembers();
        members = members.filter(m => m.id !== id);
        this.saveMembers(members);
        return { success: true };
    }

    // Auszahlungen
    getPayouts() {
        return JSON.parse(localStorage.getItem('hexenjaeger_payouts') || '[]');
    }

    savePayouts(payouts) {
        localStorage.setItem('hexenjaeger_payouts', JSON.stringify(payouts));
    }

    addEvent(eventData) {
        const { eventType, memberId, amount, totalAmount } = eventData;
        const members = this.getMembers();
        const payouts = this.getPayouts();
        
        const member = members.find(m => m.id === memberId);
        if (!member) return { error: 'Mitglied nicht gefunden' };
        
        // Event-Preise
        const EVENT_PRICES = {
            'bizwar_win': 20000, 'bizwar_lose': 10000,
            '40er_win': 40000, '40er_lose': 20000,
            'ekz': 80000, 'hafen': 40000,
            'giesserei': 10000, 'waffenfabrik': 10000
        };
        
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
        
        // Berechne Betrag
        let calculatedAmount = 0;
        if (eventType === 'cayo' || eventType === 'rp_fabrik') {
            calculatedAmount = Math.round(totalAmount / amount);
        } else {
            calculatedAmount = EVENT_PRICES[eventType] * amount;
        }
        
        payout[eventType] += amount;
        payout.total += calculatedAmount;
        
        this.savePayouts(payouts);
        return { success: true, calculatedAmount };
    }

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

    // Export/Import für Backup
    exportData() {
        return {
            members: this.getMembers(),
            payouts: this.getPayouts(),
            stats: this.getStats(),
            exportDate: new Date().toISOString()
        };
    }

    importData(data) {
        if (data.members) this.saveMembers(data.members);
        if (data.payouts) this.savePayouts(data.payouts);
        if (data.stats) this.saveStats(data.stats);
        return { success: true };
    }
}

// Globale DB Instanz
const db = new HexenjaegerDB();
