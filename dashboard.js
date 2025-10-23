document.addEventListener('DOMContentLoaded', () => {
    // --- SECURITY CHECK ---
    if (sessionStorage.getItem('paytrackUserSession') !== 'true') {
        window.location.replace('lock.html');
        return;
    }

    translatePage(); // Translate UI on load

    const newProjectForm = document.getElementById('newProjectForm');
    const newProjectNameInput = document.getElementById('newProjectName');
    const newProjectType = document.getElementById('newProjectType');
    const projectListContainer = document.getElementById('projectList');
    const noProjectsMessage = document.getElementById('noProjects');
    const notificationElement = document.getElementById('notification');
    const settingsBtn = document.getElementById('dashboardSettingsBtn');
    const projectSearchInput = document.getElementById('projectSearchInput');
    const installmentReminderBanner = document.getElementById('installmentReminderBanner');
    const dismissReminderBtn = document.getElementById('dismissReminderBtn');
    const desktopDashboardLogo = document.getElementById('desktopDashboardLogo');
    const mobileDashboardLogo = document.getElementById('mobileDashboardLogo');

    const passwordModal = document.getElementById('passwordModal');
    const deletePasswordInput = document.getElementById('deletePasswordInput');
    const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    const passwordError = document.getElementById('passwordError');
    
    const PROJECTS_KEY = 'allTrackerProjects';
    const GLOBAL_SETTINGS_KEY = 'dashboardGlobalSettings';
    const DELETE_PASSWORD_KEY = 'dashboardDeletePassword';
    const LAST_INSTALLMENT_KEY = 'lastInstallmentAddedDate';
    const LAST_DISMISS_KEY = 'lastReminderDismissedDate';

    let undoCache = null;
    let undoTimeoutId = null;
    let projectToDeleteId = null;

    const getLuminance = (hex) => {
        hex = hex.replace('#', '');
         if (hex.length === 3) {
            hex = hex.split('').map(c => c + c).join('');
        }
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    };

    const applyStylingForTheme = (config) => {
        const { isGradient, color1, color2, direction } = config;
        let startColor, endColor, backgroundStyle;

        if (isGradient) {
            startColor = color1;
            endColor = color2;
            backgroundStyle = `linear-gradient(${direction}, ${startColor}, ${endColor})`;
        } else {
            startColor = color1;
            endColor = adjustColor(startColor, getLuminance(startColor) > 0.5 ? -15 : 15);
            backgroundStyle = `linear-gradient(135deg, ${startColor}, ${endColor})`;
        }

        const avgLuminance = getLuminance(startColor); 
        const isDarkBg = avgLuminance < 0.5;

        document.body.style.setProperty('--custom-background', backgroundStyle);
        document.body.style.setProperty('--custom-header-text', isDarkBg ? 'white' : '#1f2937');
        document.body.style.setProperty('--custom-header-subtext', isDarkBg ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.7)');
        document.body.style.setProperty('--custom-icon-filter', isDarkBg ? 'brightness(0) invert(1)' : 'none');
        document.body.style.setProperty('--custom-button-bg', isDarkBg ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.05)');
        document.body.style.setProperty('--custom-button-hover-bg', isDarkBg ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.1)');
        
        document.body.classList.add('theme-custom');
    };

    const adjustColor = (hex, percent) => {
        hex = hex.replace('#', '');
        if (hex.length === 3) {
            hex = hex.split('').map(c => c + c).join('');
        }
        let r = parseInt(hex.substring(0,2), 16);
        let g = parseInt(hex.substring(2,4), 16);
        let b = parseInt(hex.substring(4,6), 16);

        const amount = Math.floor(255 * (percent / 100));

        r = Math.max(0, Math.min(255, r + amount));
        g = Math.max(0, Math.min(255, g + amount));
        b = Math.max(0, Math.min(255, b + amount));

        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    };

    function applyTheme(themeName = 'default') {
        const settings = getSettings();
        document.body.className = document.body.className.replace(/theme-\w+/g, '').trim();
        document.body.style.cssText = '';

        if (themeName.startsWith('custom-')) {
            const themeId = themeName;
            const savedTheme = settings.savedThemes?.find(t => t.id === themeId);
            if (savedTheme) {
                applyStylingForTheme(savedTheme);
            }
        } else if (themeName === 'custom' && settings.customThemeConfig) {
             applyStylingForTheme(settings.customThemeConfig);
        } else if (themeName !== 'default') {
             document.body.classList.add(`theme-${themeName}`);
        }
    }

    function getSettings() {
        return JSON.parse(localStorage.getItem(GLOBAL_SETTINGS_KEY)) || {};
    }

    function showNotification(message, type = 'success', undoCallback = null) {
        if (undoTimeoutId) {
            clearTimeout(undoTimeoutId);
            undoTimeoutId = null;
        }

        notificationElement.innerHTML = message;
        notificationElement.className = `notification ${type}`;

        if (undoCallback) {
            const undoButton = document.createElement('button');
            undoButton.textContent = 'Undo';
            undoButton.className = 'ml-4 font-bold underline';
            undoButton.onclick = () => {
                undoCallback();
                notificationElement.classList.remove('show');
                clearTimeout(undoTimeoutId);
                undoTimeoutId = null;
            };
            notificationElement.appendChild(undoButton);
            
            undoTimeoutId = setTimeout(() => {
                undoCache = null;
                undoTimeoutId = null;
                notificationElement.classList.remove('show');
            }, 7000);
        } else {
             setTimeout(() => {
                notificationElement.classList.remove('show');
            }, 3000);
        }

        notificationElement.classList.add('show');
    }

    function getProjects() {
        return JSON.parse(localStorage.getItem(PROJECTS_KEY)) || [];
    }

    function saveProjects(projects) {
        localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
    }

    function renderProjects() {
        const projects = getProjects();
        projectListContainer.innerHTML = '';
        const lang = getLanguage();

        if (projects.length === 0) {
            noProjectsMessage.classList.remove('hidden');
            projectListContainer.classList.add('hidden');
        } else {
            noProjectsMessage.classList.add('hidden');
            projectListContainer.classList.remove('hidden');
            projects.forEach(project => {
                const projectCard = document.createElement('div');
                projectCard.className = 'project-card bg-white flex items-center justify-between';
                
                const createdDate = new Date(project.id).toLocaleDateString(lang === 'ur' ? 'ar-SA' : lang);
                const projectType = project.type === 'expense' ? getTranslatedString('financeTracker') : getTranslatedString('installmentTracker');

                projectCard.innerHTML = `
                    <div class="project-card-content flex flex-col sm:flex-row items-center justify-between w-full">
                        <div class="text-center sm:text-left">
                            <h3 class="font-bold text-xl text-gray-800">${project.name}</h3>
                            <div class="flex items-center justify-center sm:justify-start gap-4 text-sm text-gray-500 mt-1">
                                <span>${getTranslatedString('created')}: ${createdDate}</span>
                                <span class="font-semibold px-2 py-0.5 rounded-full ${project.type === 'expense' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'}">
                                    ${projectType}
                                </span>
                            </div>
                        </div>
                        <div class="project-card-buttons flex-shrink-0 mt-4 sm:mt-0 flex gap-2">
                            <button class="btn-primary text-white font-semibold py-2 px-4 rounded-lg open-project-btn" data-project-id="${project.id}" title="Open Project"><i class="fas fa-folder-open"></i></button>
                            <button class="btn-secondary text-white font-semibold py-2 px-4 rounded-lg edit-project-btn" data-project-id="${project.id}" title="Edit Name"><i class="fas fa-edit"></i></button>
                            <button class="btn-danger text-white font-semibold py-2 px-4 rounded-lg delete-project-btn" data-project-id="${project.id}" title="Delete Project"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>
                `;
                projectListContainer.appendChild(projectCard);
            });
        }
    }

    function handleNewProject(e) {
        e.preventDefault();
        const projectName = newProjectNameInput.value.trim();
        const projectType = newProjectType.value;

        if (projectName) {
            const projects = getProjects();
            const newProject = {
                id: Date.now(),
                name: projectName,
                type: projectType
            };
            projects.push(newProject);
            saveProjects(projects);
            
            const projectSettingsKey = `project_${newProject.id}_settings`;
            const initialSettings = {
                expenseMode: projectType === 'expense',
                theme: 'blue',
                dynamicProgressBar: false,
                progressBarColor: 'green',
                customBanks: [],
                customExpenseTypes: []
            };
            localStorage.setItem(projectSettingsKey, JSON.stringify(initialSettings));
            
            newProjectNameInput.value = '';
            
            sessionStorage.setItem('currentProjectId', newProject.id);
            const successMessage = encodeURIComponent(`Project '${projectName}' created!`);
            window.location.href = `paytrack.html?status=success&message=${successMessage}`;
        } else {
            showNotification('Please enter a valid project name.', 'error');
        }
    }
    
    function handleEditProject(projectId) {
        let projects = getProjects();
        const projectIndex = projects.findIndex(p => p.id === projectId);
        if (projectIndex === -1) return;

        const currentName = projects[projectIndex].name;
        const newName = prompt("Enter the new project name:", currentName);

        if (newName && newName.trim() !== '' && newName.trim() !== currentName) {
            projects[projectIndex].name = newName.trim();
            saveProjects(projects);
            renderProjects();
            showNotification('Project name updated successfully.', 'success');
        }
    }

    function handleDeleteProject(projectId) {
        let projects = getProjects();
        const projectIndex = projects.findIndex(p => p.id === projectId);
        if (projectIndex === -1) return;

        const projectToDelete = projects[projectIndex];
        undoCache = {
            project: projectToDelete,
            index: projectIndex,
            installmentData: localStorage.getItem(`project_${projectId}_installment`),
            expenseData: localStorage.getItem(`project_${projectId}_expense`),
            settingsData: localStorage.getItem(`project_${projectId}_settings`)
        };

        projects.splice(projectIndex, 1);
        saveProjects(projects);

        localStorage.removeItem(`project_${projectId}_installment`);
        localStorage.removeItem(`project_${projectId}_expense`);
        localStorage.removeItem(`project_${projectId}_settings`);
        
        renderProjects();
        showNotification('Project deleted.', 'success', undoProjectDeletion);
    }

    function undoProjectDeletion() {
        if (!undoCache) return;

        const { project, index, installmentData, expenseData, settingsData } = undoCache;
        let projects = getProjects();
        
        projects.splice(index, 0, project);
        saveProjects(projects);

        if (installmentData) localStorage.setItem(`project_${project.id}_installment`, installmentData);
        if (expenseData) localStorage.setItem(`project_${project.id}_expense`, expenseData);
        if (settingsData) localStorage.setItem(`project_${project.id}_settings`, settingsData);
        
        renderProjects();
        showNotification('Project restored.', 'success');
        undoCache = null;
    }

    function getTodayDateString() {
        return new Date().toISOString().slice(0, 10); // YYYY-MM-DD format
    }

    function checkAndDisplayReminder() {
        const settings = getSettings();
        if (!settings.installmentReminder || !settings.installmentReminder.enabled) {
            return;
        }

        const today = new Date();
        const reminderDay = settings.installmentReminder.dayOfMonth;
        const currentDay = today.getDate();

        const lastInstallmentDate = localStorage.getItem(LAST_INSTALLMENT_KEY);
        const lastDismissDate = localStorage.getItem(LAST_DISMISS_KEY);
        const todayString = getTodayDateString();

        const hasInstallmentProjects = getProjects().some(p => p.type === 'installment');

        if (currentDay === reminderDay && lastInstallmentDate !== todayString && lastDismissDate !== todayString && hasInstallmentProjects) {
            installmentReminderBanner.classList.remove('hidden');
        } else {
            installmentReminderBanner.classList.add('hidden');
        }
    }

    projectListContainer.addEventListener('click', (e) => {
        const target = e.target.closest('button');
        if (!target) return;

        if (target.classList.contains('open-project-btn')) {
            const projectId = target.dataset.projectId;
            sessionStorage.setItem('currentProjectId', projectId);
            window.location.href = `paytrack.html`;
        }
        if (target.classList.contains('edit-project-btn')) {
            const projectId = parseInt(target.dataset.projectId);
            handleEditProject(projectId);
        }
        if (target.classList.contains('delete-project-btn')) {
            projectToDeleteId = parseInt(target.dataset.projectId);
            passwordModal.classList.remove('hidden');
            deletePasswordInput.focus();
        }
    });

    newProjectForm.addEventListener('submit', handleNewProject);
    
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            window.location.href = 'settings.html';
        });
    }

    const toggleLogo = (logo) => logo.classList.toggle('logo-enlarged');
    if (desktopDashboardLogo) {
        desktopDashboardLogo.addEventListener('dblclick', () => toggleLogo(desktopDashboardLogo));
    }
    if (mobileDashboardLogo) {
        mobileDashboardLogo.addEventListener('dblclick', () => toggleLogo(mobileDashboardLogo));
    }
    
    dismissReminderBtn.addEventListener('click', () => {
        localStorage.setItem(LAST_DISMISS_KEY, getTodayDateString());
        installmentReminderBanner.classList.add('hidden');
        showNotification('Reminder dismissed for today.', 'success');
    });

    cancelDeleteBtn.addEventListener('click', () => {
        passwordModal.classList.add('hidden');
        deletePasswordInput.value = '';
        passwordError.classList.add('hidden');
        projectToDeleteId = null;
    });

    confirmDeleteBtn.addEventListener('click', () => {
        const password = deletePasswordInput.value;
        const correctPassword = localStorage.getItem(DELETE_PASSWORD_KEY) || '7739';

        if (password === correctPassword) {
            handleDeleteProject(projectToDeleteId);
            passwordModal.classList.add('hidden');
            deletePasswordInput.value = '';
            passwordError.classList.add('hidden');
            projectToDeleteId = null;
        } else {
            passwordError.classList.remove('hidden');
            deletePasswordInput.value = '';
        }
    });

    projectSearchInput.addEventListener('input', () => {
        const searchTerm = projectSearchInput.value.toLowerCase();
        const projectCards = projectListContainer.querySelectorAll('.project-card');
        let visibleCount = 0;

        projectCards.forEach(card => {
            const projectName = card.querySelector('h3').textContent.toLowerCase();
            if (projectName.includes(searchTerm)) {
                card.style.display = 'flex';
                visibleCount++;
            } else {
                card.style.display = 'none';
            }
        });
        
        if (getProjects().length > 0) {
             noProjectsMessage.classList.toggle('hidden', visibleCount > 0);
             if(visibleCount === 0) {
                 noProjectsMessage.querySelector('h3').textContent = getTranslatedString('noProjectsFound');
                 noProjectsMessage.querySelector('p').textContent = getTranslatedString('noProjectsFoundDescription');
             }
        }
    });

    const settings = getSettings();
    applyTheme(settings.theme);
    renderProjects();
    checkAndDisplayReminder();
});