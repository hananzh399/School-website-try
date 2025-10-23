document.addEventListener('DOMContentLoaded', () => {
    // --- CONSTANTS ---
    const GLOBAL_SETTINGS_KEY = 'dashboardGlobalSettings';
    const DELETE_PASSWORD_KEY = 'dashboardDeletePassword';
    const USER_SESSION_KEY = 'paytrackUserSession';

    // --- DOM ELEMENTS ---
    const notificationElement = document.getElementById('notification');
    const reminderToggle = document.getElementById('reminderToggle');
    const reminderDaySelector = document.getElementById('reminderDaySelector');
    const reminderDay = document.getElementById('reminderDay');
    const themeSelector = document.getElementById('themeSelector');
    const customColorInput1 = document.getElementById('customColorInput1');
    const customColorInput2 = document.getElementById('customColorInput2');
    const colorPreview1 = document.getElementById('colorPreview1');
    const colorPreview2 = document.getElementById('colorPreview2');
    const gradientToggle = document.getElementById('gradientToggle');
    const gradientOptions = document.getElementById('gradientOptions');
    const gradientDirection = document.getElementById('gradientDirection');
    const applyCustomColorBtn = document.getElementById('applyCustomColorBtn');
    const saveThemeBtn = document.getElementById('saveThemeBtn');
    const savedThemesContainer = document.getElementById('savedThemesContainer');
    const noSavedThemesMsg = document.getElementById('noSavedThemes');
    const passwordForm = document.getElementById('passwordForm');
    const currentPasswordInput = document.getElementById('currentPassword');
    const newPasswordInput = document.getElementById('newPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const settingsLogo = document.getElementById('settingsLogo');
    const currencySelector = document.getElementById('currencySelector');
    const languageSelector = document.getElementById('languageSelector');
    
    // --- HELPER FUNCTIONS ---
    const showNotification = (message, type = 'success') => {
        notificationElement.textContent = message;
        notificationElement.className = `notification ${type}`;
        notificationElement.classList.add('show');
        setTimeout(() => {
            notificationElement.classList.remove('show');
        }, 4000);
    };

    const isValidHex = (color) => /^#?([0-9A-F]{3}){1,2}$/i.test(color);

    const getLuminance = (hex) => {
        hex = hex.replace('#', '');
        if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    };
    
    const adjustColor = (hex, percent) => {
        hex = hex.replace('#', '');
        if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
        let r = parseInt(hex.substring(0, 2), 16);
        let g = parseInt(hex.substring(2, 4), 16);
        let b = parseInt(hex.substring(4, 6), 16);
        const amount = Math.floor(255 * (percent / 100));
        r = Math.max(0, Math.min(255, r + amount));
        g = Math.max(0, Math.min(255, g + amount));
        b = Math.max(0, Math.min(255, b + amount));
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    };

    // --- THEME LOGIC ---
    const getSettings = () => JSON.parse(localStorage.getItem(GLOBAL_SETTINGS_KEY)) || {};
    const applyStylingForTheme = (config) => {
        const { isGradient, color1, color2, direction } = config;
        let startColor, endColor, backgroundStyle;
        if (isGradient) {
            startColor = color1; endColor = color2;
            backgroundStyle = `linear-gradient(${direction}, ${startColor}, ${endColor})`;
        } else {
            startColor = color1; endColor = adjustColor(startColor, getLuminance(startColor) > 0.5 ? -15 : 15);
            backgroundStyle = `linear-gradient(135deg, ${startColor}, ${endColor})`;
        }
        const isDarkBg = getLuminance(startColor) < 0.5;
        document.body.style.setProperty('--custom-background', backgroundStyle);
        document.body.style.setProperty('--custom-header-text', isDarkBg ? 'white' : '#1f2937');
        document.body.style.setProperty('--custom-header-subtext', isDarkBg ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.7)');
        document.body.style.setProperty('--custom-icon-filter', isDarkBg ? 'brightness(0) invert(1)' : 'none');
        document.body.style.setProperty('--custom-button-bg', isDarkBg ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.05)');
        document.body.style.setProperty('--custom-button-hover-bg', isDarkBg ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.1)');
        document.body.classList.add('theme-custom');
    };
    const applyTheme = (themeName = 'default') => {
        const settings = getSettings();
        document.body.className = document.body.className.replace(/theme-\w+/g, '').trim();
        document.body.style.cssText = '';
        if (themeName.startsWith('custom-')) {
            const themeId = themeName;
            const savedTheme = settings.savedThemes?.find(t => t.id === themeId);
            if (savedTheme) applyStylingForTheme(savedTheme);
        } else if (themeName === 'custom' && settings.customThemeConfig) {
            applyStylingForTheme(settings.customThemeConfig);
        } else if (themeName !== 'default') {
            document.body.classList.add(`theme-${themeName}`);
        }
    };
    function renderSavedThemes() {
        const settings = getSettings();
        savedThemesContainer.innerHTML = '';
        const savedThemes = settings.savedThemes || [];
        noSavedThemesMsg.classList.toggle('hidden', savedThemes.length > 0);
        savedThemes.forEach(theme => {
            const button = document.createElement('button');
            button.className = 'saved-theme-button h-16 rounded-lg flex items-center justify-center text-white font-medium relative';
            button.dataset.themeId = theme.id;
            const background = theme.isGradient 
                ? `linear-gradient(${theme.direction}, ${theme.color1}, ${theme.color2})`
                : theme.color1;
            button.style.background = background;
            button.style.color = getLuminance(theme.color1) < 0.5 ? 'white' : '#1f2937';
            button.textContent = theme.name;
            const deleteBtn = document.createElement('div');
            deleteBtn.className = 'delete-theme-btn';
            deleteBtn.innerHTML = '<i class="fas fa-trash-alt fa-xs"></i>';
            deleteBtn.dataset.themeId = theme.id;
            deleteBtn.title = `Delete "${theme.name}"`;
            button.appendChild(deleteBtn);
            savedThemesContainer.appendChild(button);
        });
    }
    function updateThemeUI(themeName) {
        document.querySelectorAll('.theme-option').forEach(b => b.classList.toggle('selected', b.dataset.theme === themeName));
        document.querySelectorAll('.saved-theme-button').forEach(b => b.classList.toggle('selected', b.dataset.themeId === themeName));
        const settings = getSettings();
        if (themeName === 'custom' && settings.customThemeConfig) {
            const config = settings.customThemeConfig;
            customColorInput1.value = config.color1.replace('#', '');
            gradientToggle.checked = config.isGradient;
            if(config.isGradient) {
                customColorInput2.value = config.color2.replace('#', '');
                gradientDirection.value = config.direction;
            }
            updateColorPreview(1, config.color1);
            updateColorPreview(2, config.color2);
            gradientOptions.classList.toggle('show', config.isGradient);
        }
    }
    function handleApplyCustomColor() {
        let color1 = '#' + customColorInput1.value.trim();
        if (!isValidHex(color1)) {
            showNotification('Color 1 is not a valid HEX code.', 'error'); return;
        }
        const isGradient = gradientToggle.checked;
        let config = { isGradient: false, color1: color1 };
        if (isGradient) {
            let color2 = '#' + customColorInput2.value.trim();
            if (!isValidHex(color2)) {
                showNotification('Color 2 is not a valid HEX code.', 'error'); return;
            }
            config = { isGradient: true, color1, color2, direction: gradientDirection.value };
        }
        const settings = getSettings();
        settings.theme = 'custom';
        settings.customThemeConfig = config;
        localStorage.setItem(GLOBAL_SETTINGS_KEY, JSON.stringify(settings));
        applyTheme('custom');
        updateThemeUI('custom');
        saveThemeBtn.classList.remove('hidden');
        showNotification('Custom theme preview applied!', 'success');
    }
    function handleSaveTheme() {
        const themeName = prompt("Enter a name for your new theme:");
        if (!themeName || !themeName.trim()) {
            showNotification('Theme name cannot be empty.', 'error'); return;
        }
        const settings = getSettings();
        if (!settings.customThemeConfig) {
            showNotification('No custom theme to save.', 'error'); return;
        }
        const newTheme = { id: `custom-${Date.now()}`, name: themeName.trim(), ...settings.customThemeConfig };
        if (!settings.savedThemes) settings.savedThemes = [];
        settings.savedThemes.push(newTheme);
        settings.theme = newTheme.id;
        localStorage.setItem(GLOBAL_SETTINGS_KEY, JSON.stringify(settings));
        renderSavedThemes();
        updateThemeUI(newTheme.id);
        showNotification(`Theme "${themeName}" saved!`, 'success');
    }
    function handleSavedThemesContainerClick(e) {
        const themeButton = e.target.closest('.saved-theme-button');
        const deleteButton = e.target.closest('.delete-theme-btn');
        if (deleteButton) {
            e.stopPropagation();
            const themeId = deleteButton.dataset.themeId;
            if (confirm("Are you sure you want to delete this theme?")) {
                let settings = getSettings();
                const themeToDelete = settings.savedThemes.find(t => t.id === themeId);
                settings.savedThemes = settings.savedThemes.filter(t => t.id !== themeId);
                if (settings.theme === themeId) {
                    settings.theme = 'default';
                    applyTheme('default');
                }
                localStorage.setItem(GLOBAL_SETTINGS_KEY, JSON.stringify(settings));
                renderSavedThemes();
                updateThemeUI(settings.theme);
                showNotification(`Theme "${themeToDelete.name}" deleted.`, 'success');
            }
        } else if (themeButton) {
            const themeId = themeButton.dataset.themeId;
            let settings = getSettings();
            settings.theme = themeId;
            localStorage.setItem(GLOBAL_SETTINGS_KEY, JSON.stringify(settings));
            applyTheme(themeId);
            updateThemeUI(themeId);
            showNotification('Theme updated!', 'success');
        }
    }
    function handleThemeSelection(e) {
        const button = e.target.closest('.theme-option');
        if (!button) return;
        const theme = button.dataset.theme;
        const settings = getSettings();
        settings.theme = theme;
        localStorage.setItem(GLOBAL_SETTINGS_KEY, JSON.stringify(settings));
        applyTheme(theme);
        updateThemeUI(theme);
        showNotification('Theme updated!', 'success');
    }
    function updateColorPreview(num, color) {
        const el = num === 1 ? colorPreview1 : colorPreview2;
        el.style.backgroundColor = isValidHex(color) ? color : '#f3f4f6';
    }

    // --- SECURITY LOGIC ---
    function handlePasswordUpdate(event) {
        event.preventDefault();
        const currentPassword = currentPasswordInput.value;
        const newPassword = newPasswordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        const storedPassword = localStorage.getItem(DELETE_PASSWORD_KEY) || '0000';

        if (currentPassword !== storedPassword) {
            showNotification('Current PIN is incorrect.', 'error'); return;
        }
        if (!newPassword || newPassword.length !== 4 || isNaN(newPassword)) {
            showNotification('New PIN must be exactly 4 digits.', 'error'); return;
        }
        if (newPassword !== confirmPassword) {
            showNotification('New PINs do not match.', 'error'); return;
        }
        localStorage.setItem(DELETE_PASSWORD_KEY, newPassword);
        sessionStorage.removeItem(USER_SESSION_KEY);
        showNotification('PIN updated! You will be asked to log in again.', 'success');
        passwordForm.reset();
    }
    
    // --- NOTIFICATION LOGIC ---
    function initializeReminderSettings() {
        for (let i = 1; i <= 28; i++) {
            reminderDay.add(new Option(i, i));
        }
        const settings = getSettings();
        if (settings.installmentReminder?.enabled) {
            reminderToggle.checked = true;
            reminderDay.value = settings.installmentReminder.dayOfMonth || 1;
            reminderDaySelector.classList.add('show');
        }
        reminderToggle.addEventListener('change', handleReminderSettingsChange);
        reminderDay.addEventListener('change', handleReminderSettingsChange);
    }

    function handleReminderSettingsChange() {
        let settings = getSettings();
        settings.installmentReminder = {
            enabled: reminderToggle.checked,
            dayOfMonth: parseInt(reminderDay.value, 10)
        };
        localStorage.setItem(GLOBAL_SETTINGS_KEY, JSON.stringify(settings));
        reminderDaySelector.classList.toggle('show', reminderToggle.checked);
        showNotification('Notification settings saved!', 'success');
    }
    
    // --- CURRENCY LOGIC ---
    function initializeCurrencySettings() {
        const settings = getSettings();
        const currentCurrency = settings.currency || 'USD';
        currencySelector.value = currentCurrency;
    }

    function handleCurrencyChange() {
        let settings = getSettings();
        const selectedOption = currencySelector.options[currencySelector.selectedIndex];
        settings.currency = selectedOption.value;
        settings.currencySymbol = selectedOption.dataset.symbol;
        localStorage.setItem(GLOBAL_SETTINGS_KEY, JSON.stringify(settings));
        showNotification(`Currency changed to ${settings.currency} (${settings.currencySymbol})`, 'success');
    }

    // --- LANGUAGE LOGIC ---
    function initializeLanguageSettings() {
        const currentLanguage = getLanguage();
        languageSelector.value = currentLanguage;
    }

    function handleLanguageChange() {
        const newLang = languageSelector.value;
        setLanguage(newLang); 
        showNotification('Language updated successfully!', 'success');
    }

    // --- PAGE INITIALIZER ---
    function initializePage() {
        if (sessionStorage.getItem(USER_SESSION_KEY) !== 'true') {
            window.location.replace('lock.html');
            return;
        }
        
        translatePage(); 
        
        const settings = getSettings();
        applyTheme(settings.theme || 'default');
        updateThemeUI(settings.theme || 'default');
        renderSavedThemes();
        
        themeSelector.addEventListener('click', handleThemeSelection);
        applyCustomColorBtn.addEventListener('click', handleApplyCustomColor);
        saveThemeBtn.addEventListener('click', handleSaveTheme);
        gradientToggle.addEventListener('change', () => gradientOptions.classList.toggle('show', gradientToggle.checked));
        customColorInput1.addEventListener('input', (e) => updateColorPreview(1, '#' + e.target.value));
        customColorInput2.addEventListener('input', (e) => updateColorPreview(2, '#' + e.target.value));
        savedThemesContainer.addEventListener('click', handleSavedThemesContainerClick);
        
        if (settingsLogo) {
            settingsLogo.addEventListener('dblclick', () => {
                settingsLogo.classList.toggle('logo-enlarged');
            });
        }
        
        passwordForm.addEventListener('submit', handlePasswordUpdate);
        
        initializeReminderSettings();
        
        initializeCurrencySettings();
        currencySelector.addEventListener('change', handleCurrencyChange);
        
        initializeLanguageSettings();
        languageSelector.addEventListener('change', handleLanguageChange);
    }

    initializePage();
});