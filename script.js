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
    let diseasesData = null;
    let symptomsMap = null;
    let selectedSymptoms = new Set();
    let allSymptoms = [];

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
        loadHealthData();  // Load diseases/symptoms
        // New event listeners
        document.getElementById('reportUpload').onchange = (e) => parseReports(e.target.files);
        document.getElementById('symptomsSearch').oninput = (e) => updateSymptomsUI(e.target.value);
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
            `<li>${p.date} - Score: ${Math.round(p.prediction.score)}</li>`
        ).join('') || '<li>No predictions yet</li>';
    }

    // Load diseases and symptoms map
    async function loadHealthData() {
        try {
            const [diseasesRes, mapRes] = await Promise.all([
                fetch('data/diseases.json'),
                fetch('data/symptoms-map.json')
            ]);
            diseasesData = await diseasesRes.json();
            symptomsMap = await mapRes.json();
            allSymptoms = diseasesData.allSymptoms;
            updateSymptomsUI();
            console.log('Health data loaded:', allSymptoms.length, 'symptoms');
        } catch (err) {
            console.error('Failed to load health data:', err);
        }
    }

    // Parse uploaded reports for symptoms
    function parseReports(files) {
        selectedSymptoms.clear();
        let parsedCount = 0;

        Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                let content = e.target.result;
                // Try JSON parse first
                try {
                    const jsonData = JSON.parse(content);
                    if (jsonData.symptoms) {
                        jsonData.symptoms.forEach(sym => {
                            const normalized = sym.toLowerCase().replace(/ /g, '_');
                            if (allSymptoms.includes(normalized)) {
                                selectedSymptoms.add(normalized);
                                parsedCount++;
                            }
                        });
                    }
                } catch {
                    // Text/keyword extract
                    const text = content.toLowerCase();
                    allSymptoms.forEach(sym => {
                        if (text.includes(sym.replace(/_/g, ' ')) || text.includes(sym)) {
                            selectedSymptoms.add(sym);
                            parsedCount++;
                        }
                    });
                }
                if (parsedCount > 0) {
                    updateSymptomsUI();
                    showParsedPreview(Array.from(selectedSymptoms));
                }
            };
            reader.readAsText(file);
        });
    }

    // Update dynamic symptoms UI
    function updateSymptomsUI(searchTerm = '') {
        const container = document.getElementById('symptomsSelect');
        if (!allSymptoms.length) {
            container.innerHTML = '<p>Loading symptoms...</p>';
            return;
        }
        const filtered = allSymptoms.filter(sym => 
            sym.toLowerCase().includes(searchTerm.toLowerCase())
        );
        container.innerHTML = filtered.map(sym => {
            const checked = selectedSymptoms.has(sym) ? 'checked' : '';
            return `
                <label class="checkbox-item symptom-chip">
                    <input type="checkbox" value="${sym}" ${checked} onchange="toggleSymptom('${sym}')">
                    <span>${sym.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                </label>
            `;
        }).join('') || '<p>No matching symptoms</p>';
    }

    // Toggle symptom selection
    window.toggleSymptom = function(sym) {
        if (selectedSymptoms.has(sym)) {
            selectedSymptoms.delete(sym);
        } else {
            selectedSymptoms.add(sym);
        }
        showParsedPreview(Array.from(selectedSymptoms));
    };

    // Show parsed symptoms preview
    function showParsedPreview(symptoms) {
        const preview = document.getElementById('parsedPreview');
        preview.innerHTML = `
            <strong>Parsed/Auto-selected (${symptoms.length}):</strong>
            <div class="chips-container">${symptoms.slice(0, 10).map(s => 
                `<span class="chip">${s.replace(/_/g, ' ')}</span>`
            ).join('')} ${symptoms.length > 10 ? `... +${symptoms.length-10}` : ''}</div>
        `;
        preview.classList.remove('hidden');
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

    // Age input handler
    document.getElementById('age').oninput = () => {
        document.getElementById('ageVal').textContent = document.getElementById('age').value;
    };
    // BP/Cholesterol sliders
    ['bp','cholesterol'].forEach(id => {
        document.getElementById(id).oninput = () => document.getElementById(id+'Val').textContent = document.getElementById(id).value;
    });

    // Enhanced prediction with symptoms
    function calculatePrediction(formData, symptoms) {
        let baseScore = 85;
        let risks = [];
        let riskScore = 0;

        // Basic factors
        const age = parseInt(formData.age);
        const bmi = parseFloat(formData.bmi);
        const bp = parseInt(formData.bp);
        const chol = parseInt(formData.cholesterol);

        if (age > 60) riskScore += 15;
        if (bmi > 30) riskScore += 20;
        if (bp > 140) riskScore += 15;
        if (chol > 240) riskScore += 10;

        // Symptom risks
        const symCount = symptoms.length;
        if (symCount > 3) riskScore += symCount * 3;
        
        symptomsMap.criticalSymptoms?.forEach(sym => {
            if (symptoms.includes(sym)) {
                riskScore += 20;
                risks.push(`Critical: ${sym.replace(/_/g, ' ')}`);
            }
        });

        Object.entries(symptomsMap.riskMultipliers || {}).forEach(([risk, syms]) => {
            const matchCount = syms.filter(s => symptoms.includes(s)).length;
            if (matchCount > 0) {
                riskScore += matchCount * 5;
                risks.push(`${risk} risk (${matchCount} matching symptoms)`);
            }
        });

        baseScore -= Math.min(riskScore, 70);
        const prediction = {
            score: baseScore,
            risks: risks.slice(0, 5),
            symptoms: symptoms.slice(0, 10),
            age, bmi, bp, chol
        };

        return prediction;
    }

    healthForm.onsubmit = e => {
        e.preventDefault();
        if (!currentUser) return showAuth();
        if (!diseasesData) {
            alert('Loading health data... Please wait.');
            return;
        }
        
        const formData = {
            age: document.getElementById('age').value,
            gender: document.getElementById('gender').value,
            bmi: document.getElementById('bmiVal').textContent,
            bp: document.getElementById('bp').value,
            cholesterol: document.getElementById('cholesterol').value
        };
        const symptoms = Array.from(selectedSymptoms);

        loading.classList.remove('hidden');
        results.classList.add('hidden');

        // Simulate AI
        setTimeout(() => {
            loading.classList.add('hidden');
            const prediction = calculatePrediction(formData, symptoms);
            
            document.getElementById('healthScore').textContent = Math.round(prediction.score);
            document.getElementById('riskList').innerHTML = prediction.risks.map(risk => `<li>${risk}</li>`).join('');
            document.getElementById('adviceText').textContent = 
                prediction.score > 70 ? 'Excellent health! Maintain lifestyle.' :
                prediction.score > 50 ? 'Moderate risks detected. Consult doctor for checkup.' :
                'High risks. Seek immediate medical attention.';

            // Save enhanced prediction
            currentUser.predictions.push({
                prediction,
                date: new Date().toISOString(),
                symptomsCount: symptoms.length
            });
            saveUsers();
            downloadUsers();
            
            loadUserHistory();
            results.classList.remove('hidden');
        }, 2000);
    };
});

