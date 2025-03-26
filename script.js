document.addEventListener('DOMContentLoaded', function() {
    // Elementos do DOM
    const elements = {
        addUserBtn: document.getElementById('addUserBtn'),
        userModal: document.getElementById('userModal'),
        detailModal: document.getElementById('detailModal'),
        closeModal: document.getElementById('closeModal'),
        closeDetailModal: document.getElementById('closeDetailModal'),
        cancelBtn: document.getElementById('cancelBtn'),
        userForm: document.getElementById('userForm'),
        userList: document.getElementById('userList'),
        userDetails: document.getElementById('userDetails'),
        editUserBtn: document.getElementById('editUserBtn'),
        renewUserBtn: document.getElementById('renewUserBtn'),
        deleteUserBtn: document.getElementById('deleteUserBtn'),
        totalUsersEl: document.getElementById('totalUsers'),
        activeUsersEl: document.getElementById('activeUsers'),
        expiringUsersEl: document.getElementById('expiringUsers'),
        menuBtn: document.getElementById('menuBtn'),
        statsPanel: document.getElementById('statsPanel'),
        searchInput: document.getElementById('searchInput'),
        filterBtns: document.querySelectorAll('.filter-btn')
    };

    // Variáveis de estado
    let currentUserId = null;
    let users = JSON.parse(localStorage.getItem('nexus_users')) || [];
    let currentFilter = 'all';
    let currentSearch = '';

    // Inicializar a aplicação
    initApp();
    
    // Event Listeners
    elements.addUserBtn.addEventListener('click', openAddUserModal);
    elements.closeModal.addEventListener('click', closeModalHandler);
    elements.closeDetailModal.addEventListener('click', closeDetailModalHandler);
    elements.cancelBtn.addEventListener('click', closeModalHandler);
    elements.userForm.addEventListener('submit', handleFormSubmit);
    elements.editUserBtn.addEventListener('click', openEditUserModal);
    elements.renewUserBtn.addEventListener('click', renewUser);
    elements.deleteUserBtn.addEventListener('click', deleteUser);
    elements.menuBtn.addEventListener('click', toggleStatsPanel);
    elements.searchInput.addEventListener('input', handleSearch);
    elements.filterBtns.forEach(btn => {
        btn.addEventListener('click', () => handleFilterClick(btn));
    });
    
    // Funções
    function initApp() {
        renderUserList();
        updateStats();
        
        // Configura a data mínima para hoje no campo de expiração
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('expiration').min = today;
        
        // Configura o menu mobile
        setupMobileMenu();
    }
    
    function setupMobileMenu() {
        if (window.innerWidth <= 768) {
            elements.statsPanel.classList.remove('active');
        }
    }
    
    function toggleStatsPanel() {
        elements.statsPanel.classList.toggle('active');
    }
    
    function handleSearch(e) {
        currentSearch = e.target.value.toLowerCase();
        renderUserList();
    }
    
    function handleFilterClick(btn) {
        elements.filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        renderUserList();
    }
    
    function openAddUserModal() {
        document.getElementById('modalTitle').textContent = 'CADASTRAR USUÁRIO';
        elements.userForm.reset();
        document.getElementById('userId').value = '';
        currentUserId = null;
        
        // Define a data padrão para 6 dias no futuro
        const defaultDate = new Date();
        defaultDate.setDate(defaultDate.getDate() + 6);
        document.getElementById('expiration').value = defaultDate.toISOString().split('T')[0];
        
        elements.userModal.style.display = 'block';
    }
    
    function openEditUserModal() {
        const user = users.find(u => u.id === currentUserId);
        if (user) {
            document.getElementById('modalTitle').textContent = 'EDITAR USUÁRIO';
            document.getElementById('userId').value = user.id;
            document.getElementById('name').value = user.name;
            document.getElementById('username').value = user.username;
            document.getElementById('password').value = user.password;
            document.getElementById('code').value = user.code;
            document.getElementById('category').value = user.category;
            document.getElementById('expiration').value = user.expiration;
            
            elements.detailModal.style.display = 'none';
            elements.userModal.style.display = 'block';
        }
    }
    
    function closeModalHandler() {
        elements.userModal.style.display = 'none';
    }
    
    function closeDetailModalHandler() {
        elements.detailModal.style.display = 'none';
    }
    
    function handleFormSubmit(e) {
        e.preventDefault();
        
        const id = document.getElementById('userId').value || generateId();
        const name = document.getElementById('name').value;
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const code = document.getElementById('code').value;
        const category = document.getElementById('category').value;
        const expiration = document.getElementById('expiration').value;
        
        const userData = {
            id,
            name,
            username,
            password,
            code,
            category,
            expiration,
            createdAt: currentUserId ? 
                users.find(u => u.id === currentUserId).createdAt : 
                new Date().toISOString()
        };
        
        if (currentUserId) {
            // Editar usuário existente
            const index = users.findIndex(u => u.id === currentUserId);
            if (index !== -1) {
                users[index] = userData;
            }
        } else {
            // Adicionar novo usuário
            users.push(userData);
        }
        
        saveUsers();
        renderUserList();
        updateStats();
        closeModalHandler();
        
        // Efeito de confirmação
        const btn = document.getElementById('saveBtn');
        btn.innerHTML = '<i class="fas fa-check"></i> SALVO!';
        setTimeout(() => {
            btn.innerHTML = '<i class="fas fa-save"></i> SALVAR';
        }, 2000);
    }
    
    function renderUserList() {
        elements.userList.innerHTML = '';
        
        // Filtra os usuários
        let filteredUsers = users.filter(user => {
            const matchesSearch = currentSearch === '' || 
                user.name.toLowerCase().includes(currentSearch) || 
                user.username.toLowerCase().includes(currentSearch) ||
                user.category.toLowerCase().includes(currentSearch);
            
            const daysLeft = getDaysLeft(user.expiration);
            
            const matchesFilter = 
                currentFilter === 'all' ||
                (currentFilter === 'active' && daysLeft > 3) ||
                (currentFilter === 'expiring' && daysLeft > 0 && daysLeft <= 3) ||
                (currentFilter === 'expired' && daysLeft <= 0);
            
            return matchesSearch && matchesFilter;
        });
        
        if (filteredUsers.length === 0) {
            elements.userList.innerHTML = `
                <div class="no-users" style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                    <i class="fas fa-user-slash" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                    <p>Nenhum usuário encontrado</p>
                </div>
            `;
            return;
        }
        
        // Ordena usuários por status (expirando primeiro) e depois por data de expiração
        filteredUsers.sort((a, b) => {
            const daysLeftA = getDaysLeft(a.expiration);
            const daysLeftB = getDaysLeft(b.expiration);
            
            // Se um está expirado e o outro não
            if (daysLeftA <= 0 && daysLeftB > 0) return -1;
            if (daysLeftB <= 0 && daysLeftA > 0) return 1;
            
            // Se ambos estão expirados ou não, ordena por dias restantes
            return daysLeftA - daysLeftB;
        });
        
        filteredUsers.forEach(user => {
            const daysLeft = getDaysLeft(user.expiration);
            const statusClass = getStatusClass(daysLeft);
            const statusText = getStatusText(daysLeft);
            
            const userCard = document.createElement('div');
            userCard.className = 'user-card';
            userCard.dataset.id = user.id;
            
            userCard.innerHTML = `
                <div class="status-circle ${statusClass}" title="${statusText}"></div>
                <h3>${user.name}</h3>
                <p><strong>Usuário:</strong> ${user.username}</p>
                <p><strong>Categoria:</strong> <span class="category ${user.category.replace(' ', '-')}">${user.category}</span></p>
                <p><strong>Status:</strong> ${statusText}</p>
                <p><strong>Expira em:</strong> ${formatDate(user.expiration)}</p>
            `;
            
            userCard.addEventListener('click', () => showUserDetails(user.id));
            elements.userList.appendChild(userCard);
        });
    }
    
    function showUserDetails(userId) {
        const user = users.find(u => u.id === userId);
        if (user) {
            currentUserId = userId;
            
            const daysLeft = getDaysLeft(user.expiration);
            const statusClass = getStatusClass(daysLeft);
            const statusText = getStatusText(daysLeft);
            const createdAt = new Date(user.createdAt).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            elements.userDetails.innerHTML = `
                <p><strong>Nome:</strong> ${user.name}</p>
                <p><strong>Usuário:</strong> ${user.username}</p>
                <p><strong>Senha:</strong> ${user.password}</p>
                <p><strong>Código:</strong> ${user.code}</p>
                <p><strong>Categoria:</strong> <span class="category ${user.category.replace(' ', '-')}">${user.category}</span></p>
                <p><strong>Criado em:</strong> ${createdAt}</p>
                <p><strong>Expira em:</strong> ${formatDate(user.expiration)}</p>
                <p><strong>Dias Restantes:</strong> 
                    <span class="status-text ${statusClass.replace('status-', 'text-')}">
                        ${daysLeft <= 0 ? 'Expirado há ' + Math.abs(daysLeft) + ' dias' : daysLeft + ' dias'}
                    </span>
                </p>
                <p><strong>Status:</strong> 
                    <span class="status-text ${statusClass.replace('status-', 'text-')}">
                        ${statusText}
                    </span>
                </p>
            `;
            
            elements.detailModal.style.display = 'block';
        }
    }
    
    function renewUser() {
        const user = users.find(u => u.id === currentUserId);
        if (user) {
            const expirationDate = new Date(user.expiration);
            expirationDate.setDate(expirationDate.getDate() + 6);
            
            user.expiration = expirationDate.toISOString().split('T')[0];
            saveUsers();
            renderUserList();
            updateStats();
            showUserDetails(currentUserId);
            
            // Efeito de confirmação
            elements.renewUserBtn.innerHTML = '<i class="fas fa-check"></i> RENOVADO!';
            setTimeout(() => {
                elements.renewUserBtn.innerHTML = '<i class="fas fa-sync-alt"></i> RENOVAR';
            }, 2000);
        }
    }
    
    function deleteUser() {
        if (confirm('Tem certeza que deseja excluir este usuário permanentemente?')) {
            users = users.filter(u => u.id !== currentUserId);
            saveUsers();
            renderUserList();
            updateStats();
            elements.detailModal.style.display = 'none';
        }
    }
    
    function saveUsers() {
        localStorage.setItem('nexus_users', JSON.stringify(users));
    }
    
    function updateStats() {
        elements.totalUsersEl.textContent = users.length;
        
        const activeCount = users.filter(user => {
            return getDaysLeft(user.expiration) > 3;
        }).length;
        
        elements.activeUsersEl.textContent = activeCount;
        
        const expiringCount = users.filter(user => {
            const daysLeft = getDaysLeft(user.expiration);
            return daysLeft > 0 && daysLeft <= 3;
        }).length;
        
        elements.expiringUsersEl.textContent = expiringCount;
    }
    
    function generateId() {
        return 'user_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    }
    
    function getDaysLeft(expirationDate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const expDate = new Date(expirationDate);
        expDate.setHours(0, 0, 0, 0);
        
        const diffTime = expDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    }
    
    function getStatusClass(daysLeft) {
        if (daysLeft <= 0) {
            return 'status-expired';
        } else if (daysLeft <= 3) {
            return 'status-warning';
        } else {
            return 'status-ok';
        }
    }
    
    function getStatusText(daysLeft) {
        if (daysLeft <= 0) {
            return 'Expirado';
        } else if (daysLeft <= 1) {
            return 'Expira hoje';
        } else if (daysLeft <= 3) {
            return 'Expira em breve';
        } else {
            return 'Ativo';
        }
    }
    
    function formatDate(dateString) {
        const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
        return new Date(dateString).toLocaleDateString('pt-BR', options);
    }
    
    // Fechar modais ao clicar fora do conteúdo
    window.addEventListener('click', (e) => {
        if (e.target === elements.userModal) {
            closeModalHandler();
        }
        if (e.target === elements.detailModal) {
            closeDetailModalHandler();
        }
    });
    
    // Melhorar a experiência de entrada em dispositivos móveis
    document.querySelectorAll('input, select, textarea').forEach(el => {
        el.addEventListener('focus', () => {
            window.scrollTo({
                top: el.offsetTop - 100,
                behavior: 'smooth'
            });
        });
    });
});