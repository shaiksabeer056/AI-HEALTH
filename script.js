// AI Health Predictor Logic
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('healthForm');
    const loading = document.getElementById('loading');
    const results = document.getElementById('results');
    const historyList = document.getElementById('historyList');
    let riskChart, metricsChart;

    // Update range values
    ['age', 'bp', 'cholesterol'].forEach(id => {
        const input = document.getElementById(id);
        const val = document.getElementById(id + 'Val');
        input.addEventListener('input', () => val.textContent = input.value);
    });

    // BMI Calculator
    const calcBMI = document.getElementById('calcBMI');
    calcBMI.addEventListener('click', () => {
        const height = parseFloat(document.getElementById('height').value) / 100;
        const weight = parseFloat(document.getElementById('weight').value);
        if (height && weight) {
            const bmi = (weight / (height * height)).toFixed(1);
            document.getElementById('bmiVal').textContent = bmi;
        }
    });

    // Load history
    loadHistory();

    // Form submit
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        showLoading();

        // Simulate AI delay
        await new Promise(resolve => setTimeout(resolve, 2000));

        const data = getFormData();
        const prediction = predictHealth(data);
        displayResults(prediction, data);
        saveHistory(data, prediction);
        hideLoading();
    });

    // New prediction
    document.getElementById('newPrediction').addEventListener('click', () => {
        form.reset();
        results.classList.add('hidden');
        // Reset sliders
        document.getElementById('age').value = 30;
        document.getElementById('bp').value = 120;
        document.getElementById('cholesterol').value = 180;
        document.getElementById('bmiVal').textContent = '22';
        document.getElementById('ageVal').textContent = '30';
        document.getElementById('bpVal').textContent = '120';
        document.getElementById('cholVal').textContent = '180';
    });

    function getFormData() {
        const symptoms = Array.from(document.querySelectorAll('input[name="symptoms"]:checked')).map(cb => cb.value);
        return {
            age: parseInt(document.getElementById('age').value),
            gender: document.getElementById('gender').value,
            bmi: parseFloat(document.getElementById('bmiVal').textContent),
            bp: parseInt(document.getElementById('bp').value),
            cholesterol: parseInt(document.getElementById('cholesterol').value),
            symptoms: symptoms
        };
    }

    function predictHealth(data) {
        let score = 100;
        const risks = [];
        let advice = [];

        // Age factor
        if (data.age > 60) { score -= 20; risks.push('Advanced Age Risk'); }
        else if (data.age > 40) { score -= 10; risks.push('Middle Age Risk'); }

        // BMI
        if (data.bmi > 30) { score -= 25; risks.push('Obesity (High Diabetes/Heart Risk)'); }
        else if (data.bmi > 25) { score -= 15; risks.push('Overweight'); }

        // BP
        if (data.bp > 140) { score -= 20; risks.push('Hypertension'); }
        else if (data.bp > 130) { score -= 10; risks.push('Elevated BP'); }

        // Cholesterol
        if (data.cholesterol > 240) { score -= 20; risks.push('High Cholesterol (Heart Disease Risk)'); }
        else if (data.cholesterol > 200) { score -= 10; risks.push('Borderline Cholesterol'); }

        // Symptoms
        if (data.symptoms.includes('chest_pain') || data.symptoms.includes('short_breath')) {
            score -= 25; risks.push('Cardiac Symptoms Detected');
        }
        if (data.symptoms.includes('frequent_urination')) {
            score -= 15; risks.push('Possible Diabetes');
        }
        if (data.symptoms.includes('fatigue') || data.symptoms.includes('headache')) {
            score -= 10; risks.push('General Health Concerns');
        }

        // Gender adjustment (mock)
        if (data.gender === 'female' && (data.age > 50 || data.bmi > 25)) {
            score -= 5; risks.push('Gender-Specific Risks');
        }

        score = Math.max(0, score);

        // Advice
        if (score > 80) advice = ['Excellent health! Keep it up.'];
        else if (score > 60) advice = ['Good, but watch diet and exercise.', 'Consider annual checkups.'];
        else if (score > 40) advice = ['Moderate risks. Lifestyle changes recommended.', 'Consult doctor for symptoms.'];
        else advice = ['High risks detected. Seek medical attention immediately.', 'Urgent lifestyle intervention needed.'];

        return { score: Math.round(score), risks, advice: advice.join(' ') };
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
            data: {
                labels: ['Health Score', 'Risk Factors'],
                datasets: [{ data: [prediction.score, 100 - prediction.score], backgroundColor: ['#28a745', '#dc3545'] }]
            },
            options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
        });

        const ctx2 = document.getElementById('metricsChart').getContext('2d');
        if (metricsChart) metricsChart.destroy();
        metricsChart = new Chart(ctx2, {
            type: 'bar',
            data: {
                labels: ['Age', 'BMI', 'BP', 'Chol'],
                datasets: [{ label: 'Your Metrics', data: [data.age, data.bmi, data.bp, data.cholesterol], backgroundColor: '#667eea' }]
            },
            options: { responsive: true, scales: { y: { beginAtZero: true } } }
        });
    }

    function showLoading() {
        form.classList.add('hidden');
        loading.classList.remove('hidden');
    }

    function hideLoading() {
        loading.classList.add('hidden');
        form.classList.remove('hidden');
    }

    function saveHistory(data, prediction) {
        const history = JSON.parse(localStorage.getItem('healthHistory') || '[]');
        history.unshift({ data, prediction, date: new Date().toLocaleString() });
        if (history.length > 5) history.pop();
        localStorage.setItem('healthHistory', JSON.stringify(history));
        loadHistory();
    }

    function loadHistory() {
        const history = JSON.parse(localStorage.getItem('healthHistory') || '[]');
        historyList.innerHTML = history.map(h => 
            `<li>${h.date}: Score ${h.prediction.score} (${h.data.symptoms.length ? h.data.symptoms.join(', ') : 'No symptoms'})</li>`
        ).join('');
    }
});
