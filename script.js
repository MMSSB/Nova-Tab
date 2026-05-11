document.addEventListener("DOMContentLoaded", () => {
    // --- 1. Global State Engine ---
    const defaultSettings = {
        theme: 'system', accentColor: '#005eff', sidebarOpen: true, 
        showTime: true, use24Hour: false, 
        showWeather: true, weatherLat: 30.0131, weatherLon: 31.2089, weatherCity: "Giza, Egypt",
        blurWallpaper: true, autoWallpaper: false, refreshWallpaper: false,
        brandName: 'Nova', brandLogo: 'ph-fill ph-planet',
        showGreeting: true, greetingType: 'smart', customGreetingText: 'Stay Focused!',
        showAddBtn: true, showShortcutNames: true
    };

    let savedData = JSON.parse(localStorage.getItem('nova_settings')) || {};
    let settings = { ...defaultSettings, ...savedData };
    let weatherConditionCode = 0; 
    
    function hexToRgb(hex) {
        let r = 0, g = 0, b = 0;
        if (hex.length == 4) { r = "0x" + hex[1] + hex[1]; g = "0x" + hex[2] + hex[2]; b = "0x" + hex[3] + hex[3]; } 
        else if (hex.length == 7) { r = "0x" + hex[1] + hex[2]; g = "0x" + hex[3] + hex[4]; b = "0x" + hex[5] + hex[6]; }
        return `${+r}, ${+g}, ${+b}`;
    }

    function saveSettings() {
        localStorage.setItem('nova_settings', JSON.stringify(settings));
        applySettings();
    }

    function applySettings() {
        // Theme Engine
        const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
        if (settings.theme === 'light' || (settings.theme === 'system' && prefersLight)) {
            document.body.classList.add('light-mode');
        } else {
            document.body.classList.remove('light-mode');
        }
        document.querySelectorAll('.theme-card').forEach(card => card.classList.remove('active'));
        document.querySelector(`.theme-card[data-theme="${settings.theme}"]`).classList.add('active');

        document.documentElement.style.setProperty('--accent', settings.accentColor);
        document.documentElement.style.setProperty('--accent-rgb', hexToRgb(settings.accentColor));
        document.getElementById('customColorPicker').value = settings.accentColor;

        // Branding Engine (Text & Smart Logo Parsing)
        document.getElementById('mainLogoText').textContent = settings.brandName;
        document.getElementById('sidebarLogoText').textContent = settings.brandName;
        document.getElementById('aboutTitleName').textContent = settings.brandName;
        document.getElementById('brandNameInput').value = settings.brandName;
        document.getElementById('brandLogoInput').value = settings.brandLogo;

        const isImg = settings.brandLogo.startsWith('http') || settings.brandLogo.startsWith('data:image');
        const sLogoHtml = isImg ? `<img src="${settings.brandLogo}" class="custom-logo-img">` : `<i class="${settings.brandLogo} logo-icon"></i>`;
        const aLogoHtml = isImg ? `<img src="${settings.brandLogo}" class="custom-logo-img about-logo-img">` : `<i class="${settings.brandLogo}" style="font-size: 64px; color: var(--accent); text-shadow: 0 4px 15px rgba(var(--accent-rgb), 0.5);"></i>`;
        
        document.getElementById('sidebarLogoContainer').innerHTML = sLogoHtml;
        document.getElementById('aboutLogoContainer').innerHTML = aLogoHtml;

        // Sidebar Toggle (bound to body class to stop flashing)
        settings.sidebarOpen ? document.body.classList.remove('sidebar-collapsed') : document.body.classList.add('sidebar-collapsed');
        document.getElementById('sidebarOpenToggle').checked = settings.sidebarOpen;

        // Widgets
        document.getElementById('timeWidget').style.display = settings.showTime ? 'flex' : 'none';
        document.getElementById('showTimeToggle').checked = settings.showTime;
        document.getElementById('timeFormatToggle').checked = settings.use24Hour;
        
        document.getElementById('weatherWidget').style.display = settings.showWeather ? 'flex' : 'none';
        document.getElementById('showWeatherToggle').checked = settings.showWeather;
        settings.showWeather ? document.getElementById('weatherSetupDiv').classList.add('active') : document.getElementById('weatherSetupDiv').classList.remove('active');

        document.getElementById('greetingWidget').style.display = settings.showGreeting ? 'flex' : 'none';
        document.getElementById('showGreetingToggle').checked = settings.showGreeting;
        settings.showGreeting ? document.getElementById('greetingSetupDiv').classList.add('active') : document.getElementById('greetingSetupDiv').classList.remove('active');
        document.getElementById('greetingTypeSelect').value = settings.greetingType;
        document.getElementById('customGreetingInput').value = settings.customGreetingText;
        document.getElementById('customGreetingInput').style.display = settings.greetingType === 'custom' ? 'block' : 'none';
        
        const grid = document.getElementById('shortcutsContainer');
        settings.showShortcutNames ? grid.classList.remove('hide-names') : grid.classList.add('hide-names');
        document.getElementById('showAddBtnToggle').checked = settings.showAddBtn;
        document.getElementById('showShortcutNamesToggle').checked = settings.showShortcutNames;
        renderShortcuts();

        const overlay = document.getElementById('bgOverlay');
        settings.blurWallpaper ? overlay.classList.add('blurred') : overlay.classList.remove('blurred');
        document.getElementById('blurWallpaperToggle').checked = settings.blurWallpaper;
        document.getElementById('autoWallpaperToggle').checked = settings.autoWallpaper;
        document.getElementById('refreshWallpaperToggle').checked = settings.refreshWallpaper;

        updateTime(); 
        updateGreeting();

        // Release the preload lock after applying styles to prevent flash
        setTimeout(() => document.body.classList.remove('preload'), 50);
    }

    // --- 2. Extension Links ---
    document.querySelectorAll('.nav-link').forEach(btn => {
        btn.addEventListener('click', () => {
            const url = btn.getAttribute('data-url');
            if (window.chrome && chrome.tabs) { chrome.tabs.create({ url: url }); } 
            else { window.location.href = url; }
        });
    });

    document.getElementById('newTabBtn').onclick = () => {
        if (window.chrome && chrome.tabs) chrome.tabs.create({ url: 'chrome://newtab/' });
        else window.open('chrome://newtab', '_blank');
    };

    // --- 3. Dynamic Greetings ---
    function updateGreeting() {
        if (!settings.showGreeting) return;
        if (settings.greetingType === 'custom') {
            document.getElementById('greetingText').textContent = settings.customGreetingText || "Hello";
            return;
        }

        const hour = new Date().getHours();
        let timeText = "Good Evening";
        if (hour < 12) timeText = "Good Morning";
        else if (hour < 18) timeText = "Good Afternoon";

        let weatherModifier = "";
        if (settings.showWeather) {
            if (weatherConditionCode <= 1 && hour > 6 && hour < 18) weatherModifier = "Sunny ";
            if (weatherConditionCode >= 51 && weatherConditionCode <= 67) weatherModifier = "Rainy ";
            if (weatherConditionCode >= 71) weatherModifier = "Chilly ";
        }
        document.getElementById('greetingText').textContent = weatherModifier ? `${weatherModifier}${timeText.split(' ')[1]}` : timeText;
    }

    // --- 4. Time Logic ---
    function updateTime() {
        if (!settings.showTime) return;
        const now = new Date();
        const timeOptions = { hour: 'numeric', minute: '2-digit', hour12: !settings.use24Hour };
        const dateOptions = { weekday: 'long', month: 'long', day: 'numeric' };
        document.getElementById('timeDisplay').textContent = now.toLocaleTimeString('en-US', timeOptions);
        document.getElementById('dateDisplay').textContent = now.toLocaleDateString('en-US', dateOptions);
    }
    setInterval(updateTime, 1000);

    // --- 5. Weather API ---
    async function fetchWeather() {
        if (!settings.showWeather) return;
        try {
            document.getElementById('locationDisplay').textContent = settings.weatherCity;
            const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${settings.weatherLat}&longitude=${settings.weatherLon}&current_weather=true`);
            const data = await res.json();
            
            const temp = Math.round(data.current_weather.temperature);
            weatherConditionCode = data.current_weather.weathercode;
            const isDay = data.current_weather.is_day === 1;
            document.getElementById('tempDisplay').textContent = `${temp}°C`;

            let iconClass = isDay ? 'wi-day-sunny' : 'wi-night-clear';
            if (weatherConditionCode >= 1 && weatherConditionCode <= 3) iconClass = isDay ? 'wi-day-cloudy' : 'wi-night-alt-cloudy';
            if (weatherConditionCode === 3) iconClass = 'wi-cloudy';
            if (weatherConditionCode >= 45 && weatherConditionCode <= 48) iconClass = isDay ? 'wi-day-fog' : 'wi-night-fog';
            if (weatherConditionCode >= 51 && weatherConditionCode <= 55) iconClass = 'wi-sprinkle';
            if (weatherConditionCode >= 61 && weatherConditionCode <= 67) iconClass = 'wi-rain';
            if (weatherConditionCode >= 71 && weatherConditionCode <= 77) iconClass = 'wi-snow';
            if (weatherConditionCode >= 80 && weatherConditionCode <= 82) iconClass = 'wi-showers';
            if (weatherConditionCode >= 95 && weatherConditionCode <= 99) iconClass = 'wi-thunderstorm';
            
            document.getElementById('weatherIcon').className = `wi ${iconClass}`;
            updateGreeting(); 
        } catch (err) {
            document.getElementById('tempDisplay').textContent = "Err";
        }
    }
    fetchWeather();
    setInterval(fetchWeather, 600000);

    const cityInput = document.getElementById('citySearchInput');
    const citySuggest = document.getElementById('citySuggestions');
    let cityTimeout;
    cityInput.addEventListener('input', (e) => {
        clearTimeout(cityTimeout);
        const query = e.target.value.trim();
        if (query.length < 2) { citySuggest.style.display = 'none'; return; }
        cityTimeout = setTimeout(async () => {
            try {
                const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${query}&count=5&language=en&format=json`);
                const data = await res.json();
                if (data.results && data.results.length > 0) {
                    citySuggest.innerHTML = '';
                    data.results.forEach(loc => {
                        const div = document.createElement('div');
                        div.className = 'suggestion-item'; div.textContent = `${loc.name}, ${loc.country}`;
                        div.onclick = () => {
                            settings.weatherLat = loc.latitude; settings.weatherLon = loc.longitude;
                            settings.weatherCity = `${loc.name}, ${loc.country}`;
                            saveSettings(); fetchWeather();
                            cityInput.value = ''; citySuggest.style.display = 'none';
                        };
                        citySuggest.appendChild(div);
                    });
                    citySuggest.style.display = 'flex';
                }
            } catch (err) {}
        }, 500);
    });

    // --- 6. Search Bar ---
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && searchInput.value.trim() !== '') {
            window.location.href = `https://www.google.com/search?q=${encodeURIComponent(searchInput.value.trim())}`;
        }
    });

    // --- 7. Shortcut Engine ---
    const defaultShortcuts = [
        { id: 1, name: 'GitHub', url: 'https://github.com', icon: 'ri-github-fill', disabled: false },
        { id: 2, name: 'YouTube', url: 'https://youtube.com', icon: 'ph-fill ph-youtube-logo', disabled: false }
    ];

    function getShortcuts() { return JSON.parse(localStorage.getItem('nova_shortcuts')) || defaultShortcuts; }
    function saveShortcuts(arr) { localStorage.setItem('nova_shortcuts', JSON.stringify(arr)); renderShortcuts(); }

    function renderShortcuts() {
        const grid = document.getElementById('shortcutsContainer');
        const list = document.getElementById('shortcutManagerList');
        grid.innerHTML = ''; list.innerHTML = '';
        const scs = getShortcuts();

        scs.forEach(sc => {
            if (!sc.disabled) {
                const a = document.createElement('a'); a.href = sc.url; a.className = 'shortcut-card bento-item';
                let iconHtml = `<span>${sc.name.charAt(0)}</span>`; 
                if (sc.icon) {
                    if (sc.icon.includes('.') || sc.icon.startsWith('http') || sc.icon.startsWith('data:image')) {
                        iconHtml = `<img src="${sc.icon}" style="width:24px; height:24px; border-radius:4px;">`;
                    } else if (sc.icon.includes('-') || sc.icon.includes(' ')) {
                        iconHtml = `<i class="${sc.icon}"></i>`;
                    } else {
                        iconHtml = `<span>${sc.icon}</span>`; 
                    }
                }
                a.innerHTML = `<div class="shortcut-icon">${iconHtml}</div><span>${sc.name}</span>`;
                grid.appendChild(a);
            }

            const item = document.createElement('div'); item.className = 'sm-item';
            item.innerHTML = `
                <div class="sm-info">
                    <i class="${sc.icon || 'ph ph-link'}"></i>
                    <span style="${sc.disabled ? 'text-decoration: line-through; opacity: 0.5;' : ''}">${sc.name}</span>
                </div>
                <div class="sm-actions">
                    <button class="sm-btn toggle-btn" title="${sc.disabled ? 'Enable' : 'Disable'}"><i class="${sc.disabled ? 'ph ph-eye-slash' : 'ph ph-eye'}"></i></button>
                    <button class="sm-btn del" title="Delete"><i class="ph ph-trash"></i></button>
                </div>
            `;
            item.querySelector('.toggle-btn').onclick = () => { sc.disabled = !sc.disabled; saveShortcuts(scs); };
            item.querySelector('.del').onclick = () => { saveShortcuts(scs.filter(s => s.id !== sc.id)); };
            list.appendChild(item);
        });

        if (settings.showAddBtn) {
            const addBtn = document.createElement('div'); addBtn.className = 'shortcut-card bento-item';
            addBtn.innerHTML = `<div class="shortcut-icon"><i class="ph ph-plus"></i></div><span>Add App</span>`;
            addBtn.onclick = () => openSettings('shortcutsTab');
            grid.appendChild(addBtn);
        }
    }

    document.getElementById('addShortcutBtn').onclick = () => {
        const name = document.getElementById('newShortcutName').value;
        let url = document.getElementById('newShortcutUrl').value;
        const icon = document.getElementById('newShortcutIcon').value || '';
        if (name && url) {
            if (!url.startsWith('http')) url = 'https://' + url;
            const scs = getShortcuts();
            scs.push({ id: Date.now(), name, url, icon, disabled: false });
            saveShortcuts(scs);
            document.getElementById('newShortcutName').value = '';
            document.getElementById('newShortcutUrl').value = '';
            document.getElementById('newShortcutIcon').value = '';
        }
    };

    // --- 8. Wallpaper Engine ---
    const bgContainer = document.getElementById('bgContainer');
    let savedWallpapers = [];
    try { savedWallpapers = JSON.parse(localStorage.getItem('nova_wallpapers')) || ['https://images.unsplash.com/photo-1506744626753-eda8151a7474?q=80&w=1920']; } catch(e) { savedWallpapers = ['https://images.unsplash.com/photo-1506744626753-eda8151a7474?q=80&w=1920']; }
    let activeWallpaper = localStorage.getItem('nova_active_wp') || savedWallpapers[0];

    function applyWallpaper() {
        if (settings.refreshWallpaper) {
            const randomCacheBuster = new Date().getTime();
            bgContainer.style.backgroundImage = `url('https://picsum.photos/1920/1080?random=${randomCacheBuster}')`;
        } else if (settings.autoWallpaper) {
            const today = new Date().toDateString().replace(/ /g, '');
            bgContainer.style.backgroundImage = `url('https://picsum.photos/seed/${today}/1920/1080')`;
        } else {
            bgContainer.style.backgroundImage = `url('${activeWallpaper}')`;
        }
    }

    function renderWallpaperGallery() {
        const gallery = document.getElementById('wallpaperGallery');
        gallery.innerHTML = '';
        savedWallpapers.forEach((wp, index) => {
            const div = document.createElement('div');
            div.className = `wp-card ${wp === activeWallpaper && !settings.autoWallpaper && !settings.refreshWallpaper ? 'active-wp' : ''}`;
            div.style.backgroundImage = `url('${wp}')`;
            
            const delBtn = document.createElement('button'); delBtn.className = 'delete-wp'; delBtn.innerHTML = '<i class="ph ph-trash"></i>';
            delBtn.onclick = (e) => {
                e.stopPropagation(); savedWallpapers.splice(index, 1);
                localStorage.setItem('nova_wallpapers', JSON.stringify(savedWallpapers));
                if (wp === activeWallpaper && savedWallpapers.length > 0) {
                    activeWallpaper = savedWallpapers[0]; localStorage.setItem('nova_active_wp', activeWallpaper); applyWallpaper();
                }
                renderWallpaperGallery();
            };

            div.onclick = () => {
                activeWallpaper = wp; 
                settings.autoWallpaper = false; settings.refreshWallpaper = false;
                localStorage.setItem('nova_active_wp', wp); 
                saveSettings(); applyWallpaper(); renderWallpaperGallery();
            };
            div.appendChild(delBtn); gallery.appendChild(div);
        });
    }

    document.getElementById('autoWallpaperToggle').onchange = (e) => { 
        settings.autoWallpaper = e.target.checked; 
        if (settings.autoWallpaper) settings.refreshWallpaper = false;
        saveSettings(); applyWallpaper(); renderWallpaperGallery(); 
    };

    document.getElementById('refreshWallpaperToggle').onchange = (e) => { 
        settings.refreshWallpaper = e.target.checked; 
        if (settings.refreshWallpaper) settings.autoWallpaper = false;
        saveSettings(); applyWallpaper(); renderWallpaperGallery(); 
    };
    
    document.getElementById('addWallpaperUrlBtn').onclick = () => {
        const url = document.getElementById('customWallpaperUrl').value;
        if (url) { savedWallpapers.push(url); localStorage.setItem('nova_wallpapers', JSON.stringify(savedWallpapers)); document.getElementById('customWallpaperUrl').value = ''; renderWallpaperGallery(); }
    };

    document.getElementById('localImageUpload').addEventListener('change', function(e) {
        const file = e.target.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = function(event) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas'); const MAX_WIDTH = 1920;
                let width = img.width; let height = img.height;
                if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
                canvas.width = width; canvas.height = height;
                const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, width, height);
                const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.6);
                try {
                    savedWallpapers.push(compressedDataUrl);
                    localStorage.setItem('nova_wallpapers', JSON.stringify(savedWallpapers));
                    renderWallpaperGallery();
                } catch (e) { alert("Storage full! Please delete some old wallpapers first."); }
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });

    applyWallpaper(); renderWallpaperGallery();

    // --- 9. UI Events & Setting Listeners ---
    const modal = document.getElementById('settingsModal');
    function openSettings(tabId = 'shortcutsTab') {
        modal.style.display = 'flex';
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
        document.getElementById(tabId).classList.add('active');
    }

    document.getElementById('settingsBtn').onclick = () => openSettings();
    document.getElementById('closeSettings').onclick = () => modal.style.display = 'none';
    window.onclick = (e) => { if (e.target == modal) modal.style.display = 'none'; };
    document.querySelectorAll('.tab-btn').forEach(btn => btn.onclick = () => openSettings(btn.getAttribute('data-tab')));

    document.querySelectorAll('.theme-card').forEach(card => {
        card.addEventListener('click', () => { settings.theme = card.getAttribute('data-theme'); saveSettings(); });
    });

    document.getElementById('sidebarToggle').onclick = () => { settings.sidebarOpen = !settings.sidebarOpen; saveSettings(); };
    document.getElementById('sidebarOpenToggle').onchange = (e) => { settings.sidebarOpen = e.target.checked; saveSettings(); };
    
    // Greeting Listeners
    document.getElementById('showGreetingToggle').onchange = (e) => { settings.showGreeting = e.target.checked; saveSettings(); };
    document.getElementById('greetingTypeSelect').onchange = (e) => { settings.greetingType = e.target.value; saveSettings(); };
    document.getElementById('customGreetingInput').oninput = (e) => { settings.customGreetingText = e.target.value; saveSettings(); };
    
    // Time & Weather Listeners
    document.getElementById('showTimeToggle').onchange = (e) => { settings.showTime = e.target.checked; saveSettings(); };
    document.getElementById('timeFormatToggle').onchange = (e) => { settings.use24Hour = e.target.checked; saveSettings(); };
    document.getElementById('showWeatherToggle').onchange = (e) => { settings.showWeather = e.target.checked; saveSettings(); };
    
    // Grid Setup
    document.getElementById('showAddBtnToggle').onchange = (e) => { settings.showAddBtn = e.target.checked; saveSettings(); };
    document.getElementById('showShortcutNamesToggle').onchange = (e) => { settings.showShortcutNames = e.target.checked; saveSettings(); };

    // Branding Setup
    const randomNames = ["Nexus", "Aura", "Zenith", "Orbit", "Pulse", "Vortex", "Stellar", "Horizon", "WebDock", "PyOS"];
    document.getElementById('randomNameBtn').onclick = () => {
        settings.brandName = randomNames[Math.floor(Math.random() * randomNames.length)];
        saveSettings();
    };
    document.getElementById('brandNameInput').oninput = (e) => { settings.brandName = e.target.value || "Nova"; saveSettings(); };
    document.getElementById('brandLogoInput').oninput = (e) => { settings.brandLogo = e.target.value || "ph-fill ph-planet"; saveSettings(); };

    // Logo Upload Logic
    document.getElementById('logoImageUpload').addEventListener('change', function(e) {
        const file = e.target.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = function(event) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas'); const MAX_SIZE = 128; // Keep logo tiny
                let width = img.width; let height = img.height;
                if (width > height) { if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; } } 
                else { if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; } }
                canvas.width = width; canvas.height = height;
                const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, width, height);
                settings.brandLogo = canvas.toDataURL('image/png');
                saveSettings();
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });

    document.getElementById('blurWallpaperToggle').onchange = (e) => { settings.blurWallpaper = e.target.checked; saveSettings(); };
    
    document.querySelectorAll('.color-circle').forEach(circle => circle.onclick = () => { settings.accentColor = circle.getAttribute('data-color'); saveSettings(); });
    document.getElementById('customColorPicker').oninput = (e) => { settings.accentColor = e.target.value; saveSettings(); };

    document.getElementById('resetBtn').onclick = () => { if(confirm("Delete all extension data? This cannot be undone.")) { localStorage.clear(); location.reload(); } };

    window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', e => {
        if (settings.theme === 'system') applySettings();
    });

    // Boot Up
    applySettings(); 
});