document.addEventListener('DOMContentLoaded', () => {
    // --- DOM ELEMENTS ---
    const pinInput = document.getElementById('pinInput');
    const dots = document.querySelectorAll('.dot');
    const keypad = document.getElementById('keypad');
    const deleteKey = document.getElementById('deleteKey');
    const errorMessage = document.getElementById('errorMessage');
    const lockoutTimer = document.getElementById('lockoutTimer');
    const timerValue = document.getElementById('timerValue');
    const pinDisplay = document.querySelector('.pin-display');
    const lockScreenLogo = document.getElementById('lockScreenLogo');
    const lockSubtitle = document.getElementById('lockSubtitle');

    // --- CONSTANTS ---
    const USER_SESSION_KEY = 'paytrackUserSession';
    const DELETE_PASSWORD_KEY = 'dashboardDeletePassword';
    const MAX_ATTEMPTS = 4;
    const LOCKOUT_DURATION = 60;

    // --- STATE ---
    let failedAttempts = 0;

    // --- CORE LOGIC ---
    const updateDots = () => {
        dots.forEach((dot, index) => {
            dot.classList.toggle('filled', index < pinInput.value.length);
        });
    };

    const handleFailedLogin = () => {
        failedAttempts++;
        errorMessage.classList.remove('hidden');
        pinInput.value = '';
        updateDots();
        pinDisplay.classList.add('shake');
        setTimeout(() => pinDisplay.classList.remove('shake'), 400);

        if (failedAttempts >= MAX_ATTEMPTS) {
            startLockout();
        }
    };

    const verifyPin = () => {
        const enteredPin = pinInput.value;
        const correctPin = localStorage.getItem(DELETE_PASSWORD_KEY) || '0000';
        if (enteredPin === correctPin) {
            sessionStorage.setItem(USER_SESSION_KEY, 'true');
            window.location.replace('dashboard.html');
        } else {
            handleFailedLogin();
        }
    };

    const startLockout = () => {
        keypad.classList.add('disabled');
        errorMessage.classList.add('hidden');
        lockoutTimer.classList.remove('hidden');
        let seconds = LOCKOUT_DURATION;
        timerValue.textContent = seconds;
        const interval = setInterval(() => {
            seconds--;
            timerValue.textContent = seconds;
            if (seconds <= 0) {
                clearInterval(interval);
                endLockout();
            }
        }, 1000);
    };

    const endLockout = () => {
        keypad.classList.remove('disabled');
        lockoutTimer.classList.add('hidden');
        failedAttempts = 0;
    };
    
    const processInput = (value) => {
        if (keypad.classList.contains('disabled')) return;
        errorMessage.classList.add('hidden');

        if (value === 'delete') {
            pinInput.value = pinInput.value.slice(0, -1);
        } else if (pinInput.value.length < 4) {
            pinInput.value += value;
        }
        updateDots();
        if (pinInput.value.length === 4) {
            setTimeout(verifyPin, 150);
        }
    };
    
    const initialize = () => {
        translatePage();
        const session = sessionStorage.getItem(USER_SESSION_KEY);
        if (session === 'true') {
            window.location.replace('dashboard.html');
            return;
        }

        // Hide default PIN message if a custom PIN is set
        if (localStorage.getItem(DELETE_PASSWORD_KEY)) {
           const defaultPinMessage = lockSubtitle.querySelector('.text-xs');
           if (defaultPinMessage) defaultPinMessage.style.display = 'none';
        }
        
        keypad.addEventListener('click', (e) => {
            if (e.target.matches('.key')) processInput(e.target.textContent);
        });
        
        if (lockScreenLogo) {
            lockScreenLogo.addEventListener('dblclick', () => lockScreenLogo.classList.toggle('logo-enlarged'));
        }

        deleteKey.addEventListener('click', () => processInput('delete'));

        document.addEventListener('keydown', (e) => {
            if (e.key >= '0' && e.key <= '9') processInput(e.key);
            else if (e.key === 'Backspace') processInput('delete');
            else if (e.key === 'Enter' && pinInput.value.length === 4) verifyPin();
        });
    };

    initialize();
});