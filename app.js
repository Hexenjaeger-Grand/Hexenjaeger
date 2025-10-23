const API_URL = 'http://localhost:3000/api';

// Mitglieder Funktionen
async function loadMembers() {
    try {
        const response = await fetch(`${API_URL}/members`);
        return await response.json();
    } catch (error) {
        console.error('Fehler beim Laden der Mitglieder:', error);
        return [];
    }
}

async function saveMember(name, id) {
    try {
        const response = await fetch(`${API_URL}/members`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, id })
        });
        return await response.json();
    } catch (error) {
        console.error('Fehler beim Speichern:', error);
        return { error: 'Verbindungsfehler' };
    }
}

// Event Handling für Mitglieder-Seite
if (window.location.pathname.includes('mitglieder.html')) {
    const memberList = document.getElementById('memberList');
    const modal = document.getElementById('memberModal');
    const addMemberBtn = document.getElementById('addMemberBtn');
    const saveMemberBtn = document.getElementById('saveMember');
    const cancelBtn = document.getElementById('cancelMember');

    async function renderMembers() {
        const members = await loadMembers();
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
    });

    saveMemberBtn.addEventListener('click', async () => {
        const name = document.getElementById('memberName').value;
        const id = document.getElementById('memberId').value;
        
        if (name && id) {
            const result = await saveMember(name, id);
            if (result.success) {
                modal.style.display = 'none';
                document.getElementById('memberName').value = '';
                document.getElementById('memberId').value = '';
                renderMembers();
            } else {
                alert(result.error || 'Fehler beim Speichern');
            }
        }
    });

    cancelBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    // Initial laden
    renderMembers();
}

// Hilfsfunktionen
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
