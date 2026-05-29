// --- 1. FIREBASE BEÁLLÍTÁS ---
const firebaseConfig = {
    apiKey: "AIzaSyBbErTXFCyJ3zzajpjNvcY4GmeXJBcefkY",
    authDomain: "work-tracker-ef0f5.firebaseapp.com",
    projectId: "work-tracker-ef0f5",
    storageBucket: "work-tracker-ef0f5.firebasestorage.app",
    messagingSenderId: "520495056665",
    appId: "1:520495056665:web:5ee1db1a06c627af6c2788",
    measurementId: "G-BJYMWX1GPM"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// --- 2. DOM ELEMEK ---
const loginScreen = document.getElementById('login-screen');
const appScreen = document.getElementById('app-screen');
const passwordInput = document.getElementById('password-input');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const loginError = document.getElementById('login-error');
const userRoleDisplay = document.getElementById('user-role-display');

const adminControls = document.getElementById('admin-controls');
const addWorkBtn = document.getElementById('add-work-btn');
const downloadTxtBtn = document.getElementById('download-txt-btn');
const workModal = document.getElementById('work-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const saveWorkBtn = document.getElementById('save-work-btn');
const deleteWorkBtn = document.getElementById('delete-work-btn'); 

const workDateInput = document.getElementById('work-date');
const timeStartInput = document.getElementById('time-start');
const timeEndInput = document.getElementById('time-end');
const calculatedTimeDisplay = document.getElementById('calculated-time');
const mainCategorySelect = document.getElementById('main-category');
const subCategoryContainer = document.getElementById('sub-category-container');
const workNotesInput = document.getElementById('work-notes');

let workEntries = [];
let unsubscribeRealtime = null;
let currentUserRole = null;
let editingEntryId = null; 

// --- 3. BIZTONSÁGOS JELSZAVAS BELÉPÉS ---
function attemptLogin() {
    const enteredPassword = passwordInput.value;
    if (!enteredPassword) return;
    loginBtn.textContent = "Belépés...";
    loginBtn.disabled = true;

    let email = "admin@tracker.local"; 
    auth.signInWithEmailAndPassword(email, enteredPassword)
        .then(() => loginSuccess('admin'))
        .catch(() => {
            email = "boss@tracker.local";
            auth.signInWithEmailAndPassword(email, enteredPassword)
                .then(() => loginSuccess('boss'))
                .catch(() => {
                    loginError.classList.remove('hidden');
                    loginBtn.textContent = "Tovább";
                    loginBtn.disabled = false;
                    passwordInput.value = '';
                });
        });
}

function loginSuccess(role) {
    currentUserRole = role;
    loginError.classList.add('hidden');
    passwordInput.value = '';
    loginBtn.textContent = "Tovább";
    loginBtn.disabled = false;
    
    if (role === 'admin') {
        userRoleDisplay.textContent = "Szerkesztő nézet (Saját)";
        adminControls.classList.remove('hidden'); 
    } else {
        userRoleDisplay.textContent = "Olvasó nézet (Főnök)";
        adminControls.classList.add('hidden'); 
    }

    loginScreen.classList.add('hidden');
    loginScreen.classList.remove('active');
    appScreen.classList.remove('hidden');
    appScreen.classList.add('active');

    startRealtimeSync();
}

function logout() {
    auth.signOut().then(() => {
        currentUserRole = null;
        if (unsubscribeRealtime) unsubscribeRealtime();
        appScreen.classList.remove('active');
        appScreen.classList.add('hidden');
        loginScreen.classList.remove('hidden');
        loginScreen.classList.add('active');
    });
}

loginBtn.addEventListener('click', attemptLogin);
passwordInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') attemptLogin(); });
logoutBtn.addEventListener('click', logout);

auth.onAuthStateChanged((user) => {
    if (user) {
        const role = user.email === 'admin@tracker.local' ? 'admin' : 'boss';
        loginSuccess(role);
    }
});

// --- 4. VALÓS IDEJŰ FELHŐ SZINKRONIZÁCIÓ ---
function startRealtimeSync() {
    unsubscribeRealtime = db.collection('logs').onSnapshot((snapshot) => {
        workEntries = [];
        snapshot.forEach((doc) => workEntries.push({ id: doc.id, ...doc.data() }));
        renderEntries();
    }, (error) => console.error("Adatbázis hiba:", error));
}

// --- 5. IDŐ ÉS DÁTUM KEZELÉS ---
function getLocalTodayDateString() {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

function getDurationInMinutes(start, end) {
    const [startHour, startMin] = start.split(':').map(Number);
    const [endHour, endMin] = end.split(':').map(Number);
    let totalStartMins = (startHour * 60) + startMin;
    let totalEndMins = (endHour * 60) + endMin;
    if (totalEndMins < totalStartMins) totalEndMins += 24 * 60; 
    return totalEndMins - totalStartMins;
}

function updateDurationDisplay() {
    if (!timeStartInput.value || !timeEndInput.value) return;
    const diffMins = getDurationInMinutes(timeStartInput.value, timeEndInput.value);
    calculatedTimeDisplay.textContent = `${Math.floor(diffMins / 60)} óra ${diffMins % 60} perc`;
}

timeStartInput.addEventListener('input', updateDurationDisplay);
timeEndInput.addEventListener('input', updateDurationDisplay);

// --- 6. DINAMIKUS KATEGÓRIÁK (INTELLIGENS TÖBBSZÖRÖS VÁLASZTÓ) ---
const subCategoryMasterList = {
    munka: { 
        theme: 'theme-munka', 
        items: ['Közműves levelek kezelése', 'Központi hívások kezelése', 'Mérőállások elküldése Pásztornak', 'Bérlőtől vettem át a butyka bérleti díjat', 'Pásztorképző angolul megvágása', 'Központi emailek kezelése', 'Közműves emailek kezelése', 'Zoom szobák beidőzítése', 'Applikációs segítségkérések kezelése', 'Nyomdába mentem átvenni a Ror-t', 'Ror postázása', 'Takarítás szervezése', 'Nemzetközi ima szervezése']
    },
    szolgalat: { 
        theme: 'theme-szolgalat', 
        items: ['Ima reggelt moderáltam', 'Imakommandót moderáltam', 'Eszter csoport ima alkalmat moderáltam', 'Fordítás', 'Op meetingen vettem részt', 'Op meetinget tartottam', 'Pásztorlás', 'Oda-vissza utazás és egyetemi klub', 'Nyíregyházi szolgálat', 'Taktaszadai szolgálat', 'Tiszalúci szolgálat', 'Kántorjánosi szolgálat', 'Ror lektorálás', 'Ror felolvasás', 'Ror pdf szerkesztése', 'Ror cover szerkesztése']
    },
    szellemi: { 
        theme: 'theme-szellemi', 
        items: ['Csendes kamra', 'Közös ima feleségemmel', 'Könyv olvasás feleségemmel', 'Prédikációra készültem']
    },
    tanulas: { 
        theme: 'theme-tanulas', 
        items: ['Orosz tanulás', 'Zongora tanulás']
    },
    sajat: { 
        theme: 'theme-sajat', 
        items: ['Készülődés', 'Otthon voltam', 'Szünet', 'Utazás a Habi családhoz', 'Szüleinkkel találkoztunk']
    },
    egyeb: { 
        theme: 'theme-egyeb', 
        items: ['Egyéb']
    }
};

function populateSubCategories(selectedMainCat) {
    const radioGroup = subCategoryContainer.querySelector('.radio-group');
    
    if (selectedMainCat === 'alvas') {
        subCategoryContainer.classList.add('hidden');
        return;
    } 
    
    subCategoryContainer.classList.remove('hidden');
    radioGroup.innerHTML = ''; 
    radioGroup.style.display = 'flex';
    radioGroup.style.flexWrap = 'wrap';
    radioGroup.style.gap = '5px';

    let orderedGroups = [];
    
    // 1. A kiválasztott főkategória elemei kerülnek a lista legelejére
    if (subCategoryMasterList[selectedMainCat]) {
        orderedGroups.push(subCategoryMasterList[selectedMainCat]);
    }
    
    // 2. A többi kategória elemei jönnek utána (kivéve az Egyéb)
    for (const key in subCategoryMasterList) {
        if (key !== selectedMainCat && key !== 'egyeb') {
            orderedGroups.push(subCategoryMasterList[key]);
        }
    }
    
    // 3. Az 'Egyéb' mindig a legeslegutolsó
    orderedGroups.push(subCategoryMasterList['egyeb']);

    orderedGroups.forEach(group => {
        group.items.forEach(subName => {
            const wrapper = document.createElement('div');
            wrapper.className = `subcat-checkbox-wrapper ${group.theme}`;
            
            // Itt type="checkbox"-ot használunk, hogy többet is lehessen választani!
            wrapper.innerHTML = `
                <input type="checkbox" id="subcat-${subName.replace(/\s+/g, '-')}" name="subcat" value="${subName}">
                <label class="subcat-label" for="subcat-${subName.replace(/\s+/g, '-')}">${subName}</label>
            `;
            radioGroup.appendChild(wrapper);
        });
    });
}

mainCategorySelect.addEventListener('change', function() {
    populateSubCategories(this.value);
});

// --- 7. MODAL KEZELÉS (HOZZÁADÁS / SZERKESZTÉS / TÖRLÉS) ---
function resetModal() {
    editingEntryId = null;
    workDateInput.value = getLocalTodayDateString();
    workNotesInput.value = '';
    mainCategorySelect.value = 'munka';
    populateSubCategories('munka');
    deleteWorkBtn.classList.add('hidden');
    saveWorkBtn.textContent = 'Mentés';
    updateDurationDisplay();
}

function openEditModal(entry) {
    editingEntryId = entry.id;
    workDateInput.value = entry.date;
    timeStartInput.value = entry.start;
    timeEndInput.value = entry.end;
    workNotesInput.value = entry.notes || '';
    
    mainCategorySelect.value = entry.mainCategory;
    populateSubCategories(entry.mainCategory);

    // Visszatöltjük az összes mentett alkategóriát (akár többet is)
    if (entry.mainCategory !== 'alvas' && entry.subCategory) {
        const savedSubCats = entry.subCategory.split(', ');
        savedSubCats.forEach(savedVal => {
            // Megkeressük és bepipáljuk a mentett elemeket
            const checkboxToSelect = document.querySelector(`input[name="subcat"][value="${savedVal}"]`);
            if (checkboxToSelect) checkboxToSelect.checked = true;
        });
    }

    deleteWorkBtn.classList.remove('hidden');
    saveWorkBtn.textContent = 'Módosítás';
    updateDurationDisplay();
    workModal.classList.remove('hidden');
}

addWorkBtn.addEventListener('click', () => {
    resetModal();
    workModal.classList.remove('hidden');
});

closeModalBtn.addEventListener('click', () => workModal.classList.add('hidden'));
workModal.addEventListener('click', (e) => { if (e.target === workModal) workModal.classList.add('hidden'); });

saveWorkBtn.addEventListener('click', () => {
    const mainCat = mainCategorySelect.value;
    let subCat = "";
    
    if (mainCat !== 'alvas') {
        // Összegyűjtjük az ÖSSZES bepipált checkboxot!
        const checkedBoxes = Array.from(document.querySelectorAll('input[name="subcat"]:checked'));
        // Vesszővel és szóközzel fűzzük össze őket
        subCat = checkedBoxes.map(box => box.value).join(', ');
    }

    const payload = {
        date: workDateInput.value,
        start: timeStartInput.value,
        end: timeEndInput.value,
        durationMins: getDurationInMinutes(timeStartInput.value, timeEndInput.value),
        mainCategory: mainCat,
        subCategory: subCat,
        notes: workNotesInput.value
    };

    if (editingEntryId) {
        db.collection('logs').doc(editingEntryId).update(payload)
            .then(() => workModal.classList.add('hidden'))
            .catch(err => alert("Hiba a módosításkor: " + err.message));
    } else {
        payload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        db.collection('logs').add(payload)
            .then(() => workModal.classList.add('hidden'))
            .catch(err => alert("Hiba a mentéskor: " + err.message));
    }
});

// TÖRLÉS LOGIKA
deleteWorkBtn.addEventListener('click', () => {
    if (editingEntryId && confirm("Biztosan véglegesen törlöd ezt a bejegyzést?")) {
        db.collection('logs').doc(editingEntryId).delete()
            .then(() => workModal.classList.add('hidden'))
            .catch(err => alert("Hiba a törléskor: " + err.message));
    }
});

// --- 8. HETI NAPTÁR ÉS ADATOK MEGJELENÍTÉSE ---
const currentViewWeekDisplay = document.getElementById('current-view-week');
const prevWeekBtn = document.getElementById('prev-week-btn');
const nextWeekBtn = document.getElementById('next-week-btn');
const timeLabelsContainer = document.getElementById('time-labels');
const daysContainer = document.getElementById('days-container');

function getMonday(d) {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(date.setDate(diff));
}

let currentWeekStart = getMonday(new Date());

function generateTimeLabels() {
    timeLabelsContainer.innerHTML = '';
    for (let i = 0; i <= 24; i++) {
        const label = document.createElement('div');
        label.className = 'time-label';
        label.style.top = `${i * 60}px`;
        label.textContent = `${i.toString().padStart(2, '0')}:00`;
        timeLabelsContainer.appendChild(label);
    }
}
generateTimeLabels();

function changeWeek(weeksToAdd) {
    currentWeekStart.setDate(currentWeekStart.getDate() + (weeksToAdd * 7));
    renderEntries();
}
prevWeekBtn.addEventListener('click', () => changeWeek(-1));
nextWeekBtn.addEventListener('click', () => changeWeek(1));

const categoryColors = {
    munka: '#e74c3c', szolgalat: '#f39c12', szellemi: '#9b59b6', sajat: '#333a36', alvas: '#000000', tanulas: '#14eb5f'
};
const dayNames = ["Hétfő", "Kedd", "Szerda", "Csütörtök", "Péntek", "Szombat", "Vasárnap"];

function renderEntries() {
    daysContainer.innerHTML = ''; 
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    
    const formatDt = (dt) => `${dt.getFullYear()}.${String(dt.getMonth() + 1).padStart(2, '0')}.${String(dt.getDate()).padStart(2, '0')}.`;
    currentViewWeekDisplay.textContent = `${formatDt(currentWeekStart)} - ${formatDt(weekEnd)}`;

    // Segédfüggvény a "tegnap" pontos dátumának kiszámításához
    const getYesterdayStr = (dateObj) => {
        const yesterday = new Date(dateObj);
        yesterday.setDate(yesterday.getDate() - 1);
        return `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    };

    for (let i = 0; i < 7; i++) {
        const currentDayDate = new Date(currentWeekStart);
        currentDayDate.setDate(currentDayDate.getDate() + i);
        const targetDateStr = `${currentDayDate.getFullYear()}-${String(currentDayDate.getMonth() + 1).padStart(2, '0')}-${String(currentDayDate.getDate()).padStart(2, '0')}`;
        const yesterdayStr = getYesterdayStr(currentDayDate);
        
        const dayCol = document.createElement('div');
        dayCol.className = 'day-column';
        
        const dayHeader = document.createElement('div');
        dayHeader.className = 'day-header';
        dayHeader.innerHTML = `${dayNames[i]}<br><span style="font-weight:normal;">${String(currentDayDate.getMonth()+1).padStart(2,'0')}.${String(currentDayDate.getDate()).padStart(2,'0')}.</span>`;
        dayCol.appendChild(dayHeader);

        // 1. Események, amik MA kezdődtek
        const dailyEntries = workEntries.filter(e => e.date === targetDateStr);
        
        // 2. Események, amik TEGNAP kezdődtek, de éjfél után (MA) érnek véget
        const spillOverEntries = workEntries.filter(e => {
            if (e.date !== yesterdayStr) return false;
            const [startH, startM] = e.start.split(':').map(Number);
            const [endH, endM] = e.end.split(':').map(Number);
            // Ha a befejezés kisebb mint a kezdés, akkor átnyúlik a másnapra!
            return (endH * 60 + endM) < (startH * 60 + startM);
        });

        // Közös renderelő logika a naptári blokkokhoz
        const createBlock = (entry, isSpillOver) => {
            const [startH, startM] = entry.start.split(':').map(Number);
            const [endH, endM] = entry.end.split(':').map(Number);
            
            let topPosition, duration;

            if (isSpillOver) {
                // Átlóg a tegnapi napról -> Ma vizuálisan 00:00-tól kezdődik
                topPosition = 0;
                duration = (endH * 60) + endM; // Befejezésig tart percekben
            } else {
                // Ma kezdődik
                topPosition = (startH * 60) + startM;
                if ((endH * 60 + endM) < topPosition) {
                    // Átlóg a holnapi napra -> Ma csak éjfélig (24:00) tart vizuálisan
                    duration = (24 * 60) - topPosition;
                } else {
                    // Normál esemény, ami elkezdődik és be is fejeződik ma
                    duration = entry.durationMins;
                }
            }

            if (duration <= 0) return; // Biztonsági szűrés

            const block = document.createElement('div');
            block.className = 'event-block';
            
            if (currentUserRole === 'admin') {
                block.classList.add('clickable');
                block.addEventListener('click', () => openEditModal(entry));
            }

            block.style.top = `${topPosition}px`;
            block.style.height = `${duration}px`;
            block.style.backgroundColor = categoryColors[entry.mainCategory];
            if (duration < 30) block.style.fontSize = '9px';

            const subText = entry.subCategory ? ` - ${entry.subCategory}` : '';
            block.innerHTML = `<strong>${entry.mainCategory.toUpperCase()}${subText}</strong>${entry.start} - ${entry.end}`;
            
            // --- Vizuális finomhangolás (Szaggatott vonal az átlógás jelzésére) ---
            if (!isSpillOver && ((endH * 60 + endM) < topPosition)) {
                block.style.borderBottom = '3px dashed rgba(255, 255, 255, 0.9)';
                block.style.borderBottomLeftRadius = '0';
                block.style.borderBottomRightRadius = '0';
            }
            if (isSpillOver) {
                block.style.borderTop = '3px dashed rgba(255, 255, 255, 0.9)';
                block.style.borderTopLeftRadius = '0';
                block.style.borderTopRightRadius = '0';
            }
            
            dayCol.appendChild(block);
        };

        // Rajzoljuk be a mai és a tegnapról áthúzódó blokkokat is!
        dailyEntries.forEach(entry => createBlock(entry, false));
        spillOverEntries.forEach(entry => createBlock(entry, true));
        
        daysContainer.appendChild(dayCol);
    }
}

// --- 9. TXT JELENTÉS GENERÁLÁSA, MÁSOLÁSA ÉS EMAIL KÜLDÉSE ---
const downloadTxtBtnLocal = document.getElementById('download-txt-btn');
const copyTxtBtn = document.getElementById('copy-txt-btn');
const emailReportBtn = document.getElementById('email-report-btn');

function generateReportText() {
    if (workEntries.length === 0) { 
        alert("Nincs még semmilyen mentett adat az adatbázisban!"); 
        return null; 
    }

    const targetDates = [];
    const formatDt = (dt) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;

    for (let i = 0; i < 7; i++) {
        const d = new Date(currentWeekStart);
        d.setDate(d.getDate() + i);
        targetDates.push(formatDt(d));
    }

    const weeklyEntries = workEntries.filter(entry => targetDates.includes(entry.date));

    if (weeklyEntries.length === 0) {
        alert("Erre a hétre még nincs rögzítve semmilyen adat!");
        return null;
    }

    const startD = new Date(targetDates[0]);
    const endD = new Date(targetDates[6]);
    const introDateStr = `${String(startD.getMonth() + 1).padStart(2, '0')}.${String(startD.getDate()).padStart(2, '0')}.-${String(endD.getMonth() + 1).padStart(2, '0')}.${String(endD.getDate()).padStart(2, '0')}.`;

    // --- EMAIL FEJLÉC ADATOK ---
    // IDE ÍRD BE AZ E-MAIL CÍMEKET:
    const emailTo = ""; 
    const emailSubject = `Molnár Márk ${introDateStr} munkabeszámoló`;

    // Biztonsági fejléc a TXT-hez és a Másoláshoz
    let headerTxt = `Címzett: ${emailTo || "(Nincs megadva címzett)"}\n`;
    headerTxt += `Tárgy: ${emailSubject}\n`;
    headerTxt += `=========================================\n\n`;

    // 1. BEVEZETŐ SZÖVEG
    let bodyTxt = `Kedves Apostolom, Abigél Pásztor, Jordán és Dániel Pásztor!\n\n`;
    bodyTxt += `Szeretettel küldöm a ${introDateStr} heti munka jelentésem.\n\n`;
    bodyTxt += `Az "szellemi" kategória, az olyan egyéb szellemi tevékenység, amit nem kértek tőlem pásztorok, de szolgáltam vele.\n\n`;
    
    const groupedByDate = {};
    let totalWeekMins = 0;
    const stats = { munka: 0, szolgalat: 0, szellemi: 0, sajat: 0, alvas: 0 };

    weeklyEntries.forEach(entry => {
        if (!groupedByDate[entry.date]) groupedByDate[entry.date] = [];
        groupedByDate[entry.date].push(entry);
        totalWeekMins += entry.durationMins;
        stats[entry.mainCategory] += entry.durationMins;
    });

    const dayNamesHUF = ["Hétfő", "Kedd", "Szerda", "Csütörtök", "Péntek", "Szombat", "Vasárnap"];

    // 2. NAPI LEBONTÁS
    targetDates.forEach((date, index) => {
        bodyTxt += `-----------------------------------------\n`;
        bodyTxt += `${dayNamesHUF[index]}\n\n`; 
        
        if (groupedByDate[date]) {
            const dailyEntries = groupedByDate[date].sort((a, b) => a.start.localeCompare(b.start));
            dailyEntries.forEach((entry, i) => {
                const hrs = Math.floor(entry.durationMins / 60);
                const m = entry.durationMins % 60;
                
                // Az új rész:
                let timeStr = "";
                if (hrs === 0) {
                    timeStr = `${m} perc`; // Ha 0 óra, csak a perceket írja ki
                } else if (m === 0) {
                    timeStr = `${hrs} óra`; // Ha 0 perc, csak az órákat
                } else {
                    timeStr = `${hrs}ó ${m} perc`;
                }

                const catLower = entry.mainCategory.toLowerCase();
                
                let detailsLine = entry.subCategory ? entry.subCategory : "";
                if (entry.notes) {
                    detailsLine += (detailsLine ? " - " : "") + entry.notes;
                }

                // Csak akkor írja ki az "Egyéb"-et, ha nem alvásról van szó ÉS üres a mező
                if (!detailsLine && entry.mainCategory !== 'alvas') {
                    detailsLine = "Egyéb";
                }
                bodyTxt += `${entry.start}-${entry.end} (${timeStr}, ${catLower})\n`;
                bodyTxt += `${detailsLine}\n`;

                if (i < dailyEntries.length - 1) {
                    bodyTxt += `\n`;
                }
            });
        } else {
            bodyTxt += `(Nincs rögzített bejegyzés)\n`;
        }
    });

    // 3. STATISZTIKA
    bodyTxt += "\n=========================================\n";
    bodyTxt += "HETI STATISZTIKA\n\n";
    
    if (totalWeekMins > 0) {
        let statBlocks = [];
        for (const [cat, mins] of Object.entries(stats)) {
            if (mins > 0) {
                const percent = ((mins / totalWeekMins) * 100).toFixed(2);
                const hrs = Math.floor(mins / 60);
                const m = mins % 60;
                
                const catName = cat.charAt(0).toUpperCase() + cat.slice(1);
                
                let timeStr = "";
                if (m === 0) {
                    timeStr = `${hrs} óra`;
                } else {
                    timeStr = `${hrs} óra ${String(m).padStart(2, '0')} perc`;
                }
                
                statBlocks.push(`${catName} (${percent}%-a a hetemnek)\nSzum: ${timeStr}`);
            }
        }
        
        bodyTxt += statBlocks.join('\n\n');
    }

    // 4. ZÁRÓ GONDOLAT / ALÁÍRÁS
    bodyTxt += "\n\nSzeretlek benneteket,\nMárk\n";

    // Összefűzzük a fejlécet és a törzset a TXT-hez és a Másoláshoz
    const fullTxt = headerTxt + bodyTxt;

    return { 
        fullTxt: fullTxt,       
        emailBody: bodyTxt,     
        emailTo: emailTo,
        emailSubject: emailSubject,
        targetDates: targetDates 
    };
}

// GOMB 1: LETÖLTÉS
if (downloadTxtBtnLocal) {
    downloadTxtBtnLocal.addEventListener('click', () => {
        const report = generateReportText();
        if (!report) return;

        const blob = new Blob([report.fullTxt], { type: "text/plain;charset=utf-8" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `Munka_Jelentes_${report.targetDates[0]}_tol_${report.targetDates[6]}.txt`;
        link.click();
    });
}

// GOMB 2: CSAK VÁGÓLAPRA MÁSOLÁS
if (copyTxtBtn) {
    copyTxtBtn.addEventListener('click', () => {
        const report = generateReportText();
        if (!report) return;

        navigator.clipboard.writeText(report.fullTxt).then(() => {
            const originalText = copyTxtBtn.innerHTML;
            copyTxtBtn.innerHTML = "✔️ Másolva!";
            setTimeout(() => {
                copyTxtBtn.innerHTML = originalText;
            }, 2000);
        }).catch(err => {
            alert("Hiba: A böngésződ nem engedélyezi a vágólap automatikus használatát!");
        });
    });
}

// GOMB 3: EMAIL KÜLDÉSE (AUTOMATIKUS OUTLOOK/MAIL MEGNYITÁS)
if (emailReportBtn) {
    emailReportBtn.addEventListener('click', () => {
        const report = generateReportText();
        if (!report) return;

        // Vágólapra másolás itt is (fejléccel együtt), biztos ami biztos
        navigator.clipboard.writeText(report.fullTxt).catch(e => console.log("Vágólap hiba, de folytatjuk az email nyitást."));

        // Megnyitjuk az alapértelmezett levelezőt
        window.location.href = `mailto:${report.emailTo}?subject=${encodeURIComponent(report.emailSubject)}&body=${encodeURIComponent(report.emailBody)}`;
    });
}

// --- 10. PWA SERVICE WORKER REGISZTRÁLÁSA ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('Service Worker regisztrálva!', reg))
            .catch(err => console.error('Service Worker hiba:', err));
    });
}