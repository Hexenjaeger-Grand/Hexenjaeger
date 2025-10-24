// Daten Management
class HexenjaegerDB {
    constructor() {
        this.init();
    }

    init() {
        if (!localStorage.getItem('hexenjaeger_members')) {
            this.saveMembers([]);
        }
        if (!localStorage.getItem('hexenjaeger_payouts')) {
            this.savePayouts([]);
        }
        if (!localStorage.getItem('hexenjaeger_stats')) {
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
        
        const EVENT_PRICES = {
            'bizwar_win': 20000, 'bizwar_lose': 10000,
            '40er_win': 40000, '40er_lose': 20000,
            'ekz': 80000, 'hafen': 40000,
            'giesserei': 10000, 'waffenfabrik': 10000,
            'cayo': 0, 'rp_fabrik': 0
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
        
        let calculatedAmount = 0;
        if (eventType === 'cayo' || eventType === 'rp_fabrik') {
            calculatedAmount = Math.round(totalAmount / amount);
        } else {
            calculatedAmount = EVENT_PRICES[eventType] * amount;
        }
        
        payout[eventType] += parseInt(amount);
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

// Einfache Mitglieder-Ladefunktion für eingabe.html
function loadMembersSimple() {
    const members = db.getMembers();
    const select = document.getElementById('memberSelect');
    
    if (!select) return;
    
    if (members.length === 0) {
        select.innerHTML = '<option value="">Keine Mitglieder vorhanden</option>';
        return;
    }
    
    select.innerHTML = '<option value="">Mitglied auswählen</option>' +
        members.map(m => `<option value="${m.id}">${escapeHtml(m.name)} (${m.id})</option>`).join('');
}

// Seiten-spezifische Initialisierung
document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname.includes('auszahlungen.html') || document.title.includes('Auszahlungen')) {
        loadPayouts();
    }
    
    if (window.location.pathname.includes('eingabe.html') || document.title.includes('Eingabe')) {
        initEventForm();
    }
    
    if (window.location.pathname.includes('mitglieder.html') || document.title.includes('Mitglieder')) {
        initMembersPage();
    }
});

// Auszahlungen laden
function loadPayouts() {
    const payouts = db.getPayouts();
    const tbody = document.getElementById('payoutBody');
    
    if (!tbody) return;
    
    tbody.innerHTML = payouts.map(payout => `
        <tr>
            <td>${escapeHtml(payout.memberId)}</td>
            <td><strong>${escapeHtml(payout.memberName)}</strong></td>
            <td><strong>${formatCurrency(payout.total)}</strong></td>
            <td>${payout.bizwar_win}W / ${payout.bizwar_lose}L</td>
            <td>${payout['40er_win']}W / ${payout['40er_lose']}L</td>
            <td>${payout.giesserei}</td>
            <td>${payout.waffenfabrik}</td>
            <td>${payout.hafen}</td>
            <td>${payout.cayo}</td>
            <td>${payout.rp_fabrik}</td>
            <td>${payout.ekz}</td>
            <td>
                <button onclick="completePayout('${payout.memberId}')" class="btn-primary">
                    Auszahlen
                </button>
            </td>
        </tr>
    `).join('');
}

function completePayout(memberId) {
    if (confirm('Auszahlung als erledigt markieren?')) {
        const result = db.completePayout(memberId);
        if (result.success) {
            loadPayouts();
        } else {
            alert('Fehler: ' + result.error);
        }
    }
}

// Event Formular
function initEventForm() {
    const eventType = document.getElementById('eventType');
    const memberSelect = document.getElementById('memberSelect');
    const amountInput = document.getElementById('amount');
    const specialAmountDiv = document.getElementById('specialAmount');
    const totalAmountInput = document.getElementById('totalAmount');
    const submitBtn = document.getElementById('submitEvent');
    
    if (!eventType) return;
    
    const members = db.getMembers();
    memberSelect.innerHTML = '<option value="">Mitglied auswählen</option>' +
        members.map(m => `<option value="${m.id}">${escapeHtml(m.name)} (${m.id})</option>`).join('');
    
    eventType.addEventListener('change', function() {
        if (this.value === 'cayo' || this.value === 'rp_fabrik') {
            specialAmountDiv.style.display = 'block';
        } else {
            specialAmountDiv.style.display = 'none';
        }
    });
    
    submitBtn.addEventListener('click', function() {
        const eventData = {
            eventType: eventType.value,
            memberId: memberSelect.value,
            amount: amountInput.value,
            totalAmount: totalAmountInput.value || 0
        };
        
        if (!eventData.eventType || !eventData.memberId || !eventData.amount) {
            alert('Bitte fülle alle Felder aus!');
            return;
        }
        
        const result = db.addEvent(eventData);
        if (result.success) {
            alert(`Event gespeichert! Betrag: ${formatCurrency(result.calculatedAmount)}`);
            eventType.value = '';
            memberSelect.value = '';
            amountInput.value = '';
            totalAmountInput.value = '';
            specialAmountDiv.style.display = 'none';
        } else {
            alert('Fehler: ' + result.error);
        }
    });
}

// Mitglieder Seite
function initMembersPage() {
    const memberList = document.getElementById('memberList');
    const modal = document.getElementById('memberModal');
    const addMemberBtn = document.getElementById('addMemberBtn');
    const saveMemberBtn = document.getElementById('saveMember');
    const cancelBtn = document.getElementById('cancelMember');
    const memberNameInput = document.getElementById('memberName');
    const memberIdInput = document.getElementById('memberId');
    
    if (!memberList) return;

    function renderMembers() {
        const members = db.getMembers();
        memberList.innerHTML = members.map(member => `
            <div class="member-item">
                <div class="member-info">
                    <strong>${escapeHtml(member.name)}</strong>
                    <span class="member-id">${escapeHtml(member.id)}</span>
                </div>
                <div class="member-actions">
                    <button class="edit-btn" onclick="editMember('${member.id}')">✏️</button>
                    <button class="delete-btn" onclick="deleteMember('${member.id}')">🗑️</button>
                </div>
            </div>
        `).join('');
    }

    addMemberBtn.addEventListener('click', () => {
        modal.style.display = 'block';
        memberNameInput.focus();
    });

    saveMemberBtn.addEventListener('click', () => {
        const name = memberNameInput.value.trim();
        const id = memberIdInput.value.trim();
        
        if (!name || !id) {
            if (!name) memberNameInput.style.borderColor = '#ef4444';
            if (!id) memberIdInput.style.borderColor = '#ef4444';
            return;
        }
        
        memberNameInput.style.borderColor = '';
        memberIdInput.style.borderColor = '';
        
        const result = db.addMember(name, id);
        if (result.success) {
            modal.style.display = 'none';
            memberNameInput.value = '';
            memberIdInput.value = '';
            renderMembers();
        } else {
            alert(result.error);
        }
    });

    cancelBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        memberNameInput.style.borderColor = '';
        memberIdInput.style.borderColor = '';
    });

    memberNameInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') saveMemberBtn.click();
    });
    
    memberIdInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') saveMemberBtn.click();
    });

    renderMembers();
}

// Globale Funktionen für die Buttons
window.editMember = (id) => {
    const members = db.getMembers();
    const member = members.find(m => m.id === id);
    if (member) {
        const newName = prompt('Neuen Namen eingeben:', member.name);
        if (newName && newName.trim()) {
            db.updateMember(id, newName.trim());
            if (window.location.pathname.includes('mitglieder.html')) {
                initMembersPage();
            }
        }
    }
};

window.deleteMember = (id) => {
    if (confirm('Mitglied wirklich löschen?')) {
        db.deleteMember(id);
        if (window.location.pathname.includes('mitglieder.html')) {
            initMembersPage();
        }
    }
};
