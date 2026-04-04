// AI Health Predictor - Working Simple Version
// LocalStorage users + Desktop download backup

document.addEventListener('DOMContentLoaded', function() {
    const USERS_KEY = 'healthUsers';
    const TOKEN_KEY = 'healthToken';

    // Elements - use existing IDs
    const authSection = document.getElementById('authSection');
    const app = document.getElementById('app');
    const logoutBtn = document.getElementById('logoutBtn');
    const userInfo = document.getElementById('userInfo');
    const healthForm = document.getElementById('healthForm');
    const loading = document.getElementById('loading');
    const results = document.getElementById('results');
    const historyList = document.getElementById('historyList');
    const signinForm = document.getElementById('signinForm');
    const signupForm = document.getElementById('signupForm');
    const authMessage = document.getElementById('authMessage');
    const tabBtns = document.querySelectorAll('.tab-btn');

    let currentUser = null;
    let users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    let riskChart, metricsChart;

    // Hash password
    function hash(str) {
        let h = 0;
        for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) & 0xFFFFFFFF;
        return Math.abs(h).toString(36);
    }

    function saveUsers() {
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
    }

    function downloadUsers() {
        const dataStr = JSON.stringify(users, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'data_users.json';
        a.click();
        URL.revokeObjectURL(url);
    }

    function isLoggedIn() {
        const token = localStorage.getItem(TOKEN_KEY);
        if (!token) return false;
        const data = JSON.parse(token);
        return data.userId && (Date.now() - data.timestamp < 3600000);
    }

    function signup(name, mobile, email, password) {
        if (!/^[0-9]{10}$/.test(mobile)) return showMessage('10 digit mobile required', 'error');
        if (users.find(u => u.mobile === mobile || u.email === email)) return showMessage('User exists', 'error');

        const newUser = {
            id: Date.now().toString(),
            name,
            mobile,
            email,
            passwordHash: hash(password),
            predictions: [],
            created: new Date().toLocaleString()
        };

        users.push(newUser);
        saveUsers();
        downloadUsers(); // Save to Desktop
        showMessage('Account created & saved to Desktop! Entering app...', 'success');
        
        // Auto login
        currentUser = newUser;
        localStorage.setItem(TOKEN_KEY, JSON.stringify({userId: newUser.id, timestamp: Date.now()}));
        setTimeout(() => showApp(), 1000);
        return true;
    }

    function signin(identifier, password) {
        const user = users.find(u => u.mobile === identifier || u.email === identifier);
        if (user && user.passwordHash === hash(password)) {
            currentUser = user;
            localStorage.setItem(TOKEN_KEY, JSON.stringify({userId: user.id, timestamp: Date.now()}));
            showApp();
            return true;
        }
        showMessage('Wrong credentials', 'error');
        return false;
    }

    function logout() {
        localStorage.removeItem(TOKEN_KEY);
        currentUser = null;
        showAuth();
    }

    function showApp() {
        authSection.classList.add('hidden');
        app.classList.remove('hidden');
        updateUserInfo();
        loadUserHistory();
    }

    function showAuth() {
        app.classList.add('hidden');
        authSection.classList.remove('hidden');
        authMessage.classList.remove('show');
    }

    function showMessage(text, type) {
        authMessage.textContent = text;
        authMessage.className = `auth-message ${type} show`;
        setTimeout(() => authMessage.classList.remove('show'), 3000);
    }

    function updateUserInfo() {
        userInfo.textContent = currentUser ? `Welcome ${currentUser.name}` : '';
    }

    function loadUserHistory() {
        if (!currentUser) return;
        const predictions = currentUser.predictions || [];
        historyList.innerHTML = predictions.slice(0, 10).map(p => 
            `<li>${p.date} - Score: ${p.prediction.score}</li>`
        ).join('') || '<li>No predictions yet</li>';
    }

    // Tab switch
    tabBtns.forEach(btn => {
        btn.onclick = () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
            document.getElementById(btn.dataset.tab + 'Form').classList.add('active');
        };
    });

    // Init
    if (isLoggedIn()) {
        const token = JSON.parse(localStorage.getItem(TOKEN_KEY));
        currentUser = users.find(u => u.id === token.userId);
        showApp();
    } else {
        showAuth();
    }

    logoutBtn.onclick = logout;
    signinForm.onsubmit = e => { e.preventDefault(); signin(signinForm.signinIdentifier.value, signinForm.signinPassword.value); };
    signupForm.onsubmit = e => { 
        e.preventDefault(); 
        signup(signupForm.signupName.value, signupForm.signupMobile.value, signupForm.signupEmail.value, signupForm.signupPassword.value); 
    };

    // Health form (simple working version)
    document.getElementById('calcBMI').onclick = () => {
        const h = parseFloat(document.getElementById('height').value);
        const w = parseFloat(document.getElementById('weight').value);
        if (h && w) document.getElementById('bmiVal').textContent = (w / ((h/100)**2)).toFixed(1);
    };

    ['age','bp','cholesterol'].forEach(id => {
        document.getElementById(id).oninput = () => document.getElementById(id+'Val').textContent = document.getElementById(id).value;
    });

    healthForm.onsubmit = e => {
        e.preventDefault();
        if (!currentUser) return showAuth();
        
        // Simple prediction
        const score = 85 - Math.random()*20;
        results.classList.remove('hidden');
        document.getElementById('healthScore').textContent = Math.round(score);
        document.getElementById('riskList').innerHTML = '<li>Test risk</li>';
        document.getElementById('adviceText').textContent = 'Great health!';
        
        // Save prediction
        currentUser.predictions.push({score, date: new Date().toISOString()});
        saveUsers();
        downloadUsers();
        
        loadUserHistory();
    };
});

