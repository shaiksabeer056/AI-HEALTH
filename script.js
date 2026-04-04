// Neural Health AI - Advanced Predictor with File-based Auth
const USERS_URL = 'data/users.json';

document.addEventListener('DOMContentLoaded', function() {
    // Elements
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
    let riskChart, metricsChart;

    // Simple hash function (demo only)
    function hash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36);
    }

    // Auth functions
    async function loadUsers() {
        try {
            const response = await fetch(USERS_URL);
            return await response.json();
        } catch {
            return [];
        }
    }

    async function saveUsers(users) {
        await fetch(USERS_URL, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(users)
        });
    }

    function isLoggedIn() {
        const token = localStorage.getItem('authToken');
        if (!token) return false;
        try {
            const data = JSON.parse(token);
            return data.userId && (Date.now() - data.timestamp < 3600000);
        } catch {
            return false;
        }
    }

    async function signup(name, mobile, email, password) {
        if (!/^[0-9]{10}$/.test(mobile)) {
            showMessage('Invalid mobile number (10 digits required)', 'error');
            return false;
        }
        if (!/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
            showMessage('Invalid email format', 'error');
            return false;
        }

        const users = await loadUsers();
        if (users.find(u => u.mobile === mobile || u.email === email)) {
            showMessage('Mobile or email already registered', 'error');
            return false;
        }

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
        await saveUsers(users);
        showMessage('Account created successfully! You can now sign in.', 'success');
        return true;
    }

    async function signin(identifier, password) {
        const users = await loadUsers();
        const user = users.find(u => u.mobile === identifier || u.email === identifier);
        if (user && user.passwordHash === hash(password)) {
            localStorage.setItem('authToken', JSON.stringify({
                userId: user.id,
                timestamp: Date.now()
            }));
            currentUser = user;
            showApp();
            updateUserInfo();
            return true;
        }
        showMessage('Invalid mobile/email or password', 'error');
        return false;
    }

    function logout() {
        localStorage.removeItem('authToken');
        currentUser = null;
        showAuth();
    }

    function showApp() {
        authSection.classList.add('hidden');
        app.classList.remove('hidden');
        loadUserHistory();
    }

    function showAuth() {
        app.classList.add('hidden');
        authSection.classList.remove('hidden');
        signupForm.reset();
        signinForm.reset();
        authMessage.classList.remove('show');
    }

    function showMessage(text, type) {
        authMessage.textContent = text;
        authMessage.className = `auth-message ${type} show`;
        setTimeout(() => authMessage.classList.remove('show'), 5000);
    }

    function updateUserInfo() {
        if (currentUser) {
            userInfo.textContent = `Welcome, ${currentUser.name}`;
        }
    }

    // Tab switching
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
            document.getElementById(btn.dataset.tab + 'Form').classList.add('active');
        });
    });

    // Event listeners
    if (isLoggedIn()) {
        // Load current user
        const token = JSON.parse(localStorage.getItem('authToken'));
        loadUsers().then(users => {
            currentUser = users.find(u => u.id === token.userId);
            showApp();
            updateUserInfo();
        });
    } else {
        showAuth();
    }

    logoutBtn.addEventListener('click', logout);

    signinForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const identifier = document.getElementById('signinIdentifier').value.trim();
        const password = document.getElementById('signinPassword').value;
        await signin(identifier, password);
    });

    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('signupName').value.trim();
        const mobile = document.getElementById('signupMobile').value.trim();
        const email = document.getElementById('signupEmail').value.trim();
        const password = document.getElementById('signupPassword').value;
        await signup(name, mobile, email, password);
    });

    // Health form functionality
    ['age', 'bp', 'cholesterol'].forEach(id => {
        const input = document.getElementById(id);
        const val = document.getElementById(id + 'Val');
        input.addEventListener('input', () => val.textContent = input.value);
    });

    document.getElementById('calcBMI').addEventListener('click', () => {
        const height = parseFloat(document.getElementById('height').value) / 100;
        const weight = parseFloat(document.getElementById('weight').value);
        if (height && weight) {
            const bmi = (weight / (height * height)).toFixed(1);
            document.getElementById('bmiVal').textContent = bmi;
        }
    });

    healthForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!isLoggedIn()) return;
        
        showLoading();
        await new Promise(resolve => setTimeout(resolve, 2500));

        const data = getFormData();
        const prediction = predictHealth(data);
        displayResults(prediction, data);
        await savePrediction(data, prediction);
        hideLoading();
    });

    document.getElementById('newPrediction').addEventListener('click', resetForm);

    // Health prediction functions
    function getFormData() {
        const symptoms = Array.from(document.querySelectorAll('input[name="symptoms"]:checked')).map(cb => cb.value);
        return {
            age: parseInt(document.getElementById('age').value),
            gender: document.getElementById('gender').value,
            bmi: parseFloat(document.getElementById('bmiVal').textContent),
            bp: parseInt(document.getElementById('bp').value),
            cholesterol: parseInt(document.getElementById('cholesterol').value),
            symptoms
        };
    }

    function predictHealth(data) {
        let score = 100;
        const risks = [];
        let advice = [];

        // Same scoring logic as before (abbreviated)
        if (data.age > 60) { score -= 20; risks.push('Advanced Age Risk'); }
        else if (data.age > 40) { score -= 10; risks.push('Middle Age Risk'); }

        if (data.bmi > 30) { score -= 25; risks.push('Obesity Risk'); }
        else if (data.bmi > 25) { score -= 15; risks.push('Overweight'); }

        if (data.bp > 140) { score -= 20; risks.push('Hypertension'); }
        if (data.cholesterol > 240) { score -= 20; risks.push('High Cholesterol'); }

        // Symptoms scoring...
        data.symptoms.forEach(symptom => {
            if (['chest_pain', 'short_breath'].includes(symptom)) score -= 25;
            if (symptom === 'frequent_urination') score -= 15;
            if (['fatigue', 'headache'].includes(symptom)) score -= 10;
        });

        score = Math.max(0, score);

        advice = score > 80 ? ['Excellent health!'] : 
                score > 60 ? ['Monitor diet & exercise'] : 
                score > 40 ? ['Consult doctor'] : ['Urgent medical attention'];

        return { score: Math.round(score), risks, advice: advice.join(' ') };
    }

    async function savePrediction(data, prediction) {
        if (!currentUser) return;
        const users = await loadUsers();
        const user = users.find(u => u.id === currentUser.id);
        if (user) {
            user.predictions.unshift({
                data,
                prediction,
                date: new Date().toLocaleString()
            });
            if (user.predictions.length > 10) user.predictions = user.predictions.slice(0, 10);
            await saveUsers(users);
            loadUserHistory();
        }
    }

    async function loadUserHistory() {
        if (!currentUser) return;
        const users = await loadUsers();
        const user = users.find(u => u.id === currentUser.id);
        if (user && user.predictions) {
            historyList.innerHTML = user.predictions.map(p => 
                `<li>${p.date}: Score ${p.prediction.score} (${p.data.symptoms.length ? p.data.symptoms.join(', ') : 'No symptoms'})</li>`
            ).join('');
        }
    }

    function displayResults(prediction, data) {
        results.classList.remove('hidden');
        document.getElementById('healthScore').textContent = prediction.score;
        document.getElementById('riskList').innerHTML = prediction.risks.map(risk => `<li>${risk}</li>`).join('');
        document.getElementById('adviceText').textContent = prediction.advice;

        // Charts
        const ctx1 = document.getElementById('riskChart').getContext('2d');
        if (riskChart) riskChart.destroy();
        riskChart = new Chart(ctx1, {
            type: 'doughnut',
            data: { labels: ['Health Score', 'Risk'], datasets: [{ data: [prediction.score, 100-prediction.score], backgroundColor: ['#4ade80', '#f87171'] }] },
            options: { responsive: true }
        });

        const ctx2 = document.getElementById('metricsChart').getContext('2d');
        if (metricsChart) metricsChart.destroy();
        metricsChart = new Chart(ctx2, {
            type: 'bar',
            data: { labels: ['Age', 'BMI', 'BP', 'Chol'], datasets: [{ label: 'Metrics', data: [data.age, data.bmi, data.bp, data.cholesterol], backgroundColor: '#667eea' }] },
            options: { responsive: true, scales: { y: { beginAtZero: true } } }
        });
    }

    function showLoading() {
        healthForm.classList.add('hidden');
        loading.classList.remove('hidden');
    }

    function hideLoading() {
        loading.classList.add('hidden');
        healthForm.classList.remove('hidden');
    }

    function resetForm() {
        healthForm.reset();
        results.classList.add('hidden');
        document.getElementById('age').value = 30;
        document.getElementById('bp').value = 120;
        document.getElementById('cholesterol').value = 180;
        document.getElementById('bmiVal').textContent = '22';
        document.getElementById('ageVal').textContent = '30';
        document.getElementById('bpVal').textContent = '120';
        document.getElementById('cholVal').textContent = '180';
    }
});

