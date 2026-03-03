document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const canvas = document.createElement('canvas');
    canvas.id = 'particle-canvas';
    document.body.prepend(canvas);
    const ctx = canvas.getContext('2d');
    let particles = [];

    const setupCanvas = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    };

    const createParticles = () => {
        particles = [];
        const particleCount = Math.floor(canvas.width * canvas.height / 25000);
        for (let i = 0; i < particleCount; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: Math.random() * 0.4 - 0.2,
                vy: Math.random() * 0.4 - 0.2,
                radius: Math.random() * 1.5 + 0.5,
                opacity: Math.random() * 0.5 + 0.2
            });
        }
    };

    setupCanvas();
    createParticles();
    const eventForm = document.getElementById('event-form');
    const eventNameInput = document.getElementById('event-name');
    const eventDateInput = document.getElementById('event-date');
    const eventTimeInput = document.getElementById('event-time');
    const eventDescriptionInput = document.getElementById('event-description');
    const categoriesContainer = document.getElementById('countdown-categories');
    const pastEventsContainer = document.getElementById('past-events-container');
    const gridViewBtn = document.getElementById('grid-view-btn');
    const listViewBtn = document.getElementById('list-view-btn');
    const currentEventsBtn = document.getElementById('current-events-btn');
    const pastEventsBtn = document.getElementById('past-events-btn');
    const themeToggle = document.getElementById('theme-toggle');
    const modal = document.getElementById('event-modal');
    const modalCloseBtn = document.getElementById('modal-close-btn');

    const drawParticles = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`;
            ctx.fill();

            p.x += p.vx;
            p.y += p.vy;

            if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
            if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        });
    };

    // --- Theme Handling ---
    const applyTheme = (theme) => {
        document.body.dataset.theme = theme;
        localStorage.setItem('theme', theme);
        if (themeToggle) themeToggle.textContent = theme === 'light' ? '🌙' : '☀️';
    };

    themeToggle?.addEventListener('click', () => {
        const newTheme = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
        applyTheme(newTheme);
    });


    // Data
    let events = JSON.parse(localStorage.getItem('countdownEvents')) || [];
    let pastEvents = JSON.parse(localStorage.getItem('pastCountdownEvents')) || [];
    let deleteTimeouts = {};
    let editMode = { active: false, eventId: null };

    // --- Saving ---
    const saveEvents = () => {
        localStorage.setItem('countdownEvents', JSON.stringify(events));
        localStorage.setItem('pastCountdownEvents', JSON.stringify(pastEvents));
    };

    // --- Rendering ---
    const render = () => {
        renderCurrentEvents();
        renderPastEvents();
    };

    const renderCurrentEvents = () => {
        const lists = {
            days: document.getElementById('days-list'),
            weeks: document.getElementById('weeks-list'),
            months: document.getElementById('months-list')
        };
        Object.values(lists).forEach(list => list.innerHTML = '');

        const now = new Date();
        const stillCurrentEvents = [];
        events.forEach(event => {
            const targetDate = new Date(event.date);
            if (targetDate < now) {
                pastEvents.unshift(event);
            } else {
                stillCurrentEvents.push(event);
            }
        });
        events = stillCurrentEvents;

        if (events.length === 0) {
            document.getElementById('soon-category').classList.add('hidden');
            document.getElementById('weeks-category').classList.add('hidden');
            document.getElementById('months-category').classList.add('hidden');
            lists.days.innerHTML = `<p class="empty-list-msg">No countdowns yet. Add one above to get started!</p>`;
            document.getElementById('soon-category').classList.remove('hidden');
            return;
        }

        const eventsAdded = { days: 0, weeks: 0, months: 0 };

        events.forEach(event => {
            const targetDate = new Date(event.date);
            const diffDays = Math.ceil((targetDate - now) / (1000 * 60 * 60 * 24));
            const card = createCard(event);

            if (diffDays < 7) {
                lists.days.appendChild(card);
                eventsAdded.days++;
            } else if (diffDays <= 30) {
                lists.weeks.appendChild(card);
                eventsAdded.weeks++;
            } else {
                lists.months.appendChild(card);
                eventsAdded.months++;
            }
        });

        document.getElementById('soon-category').classList.toggle('hidden', eventsAdded.days === 0);
        document.getElementById('weeks-category').classList.toggle('hidden', eventsAdded.weeks === 0);
        document.getElementById('months-category').classList.toggle('hidden', eventsAdded.months === 0);

        updateTimers();
    };

    const renderPastEvents = () => {
        const list = document.getElementById('past-events-list');
        list.innerHTML = '';
        if (pastEvents.length === 0) {
            list.innerHTML = `<p class="empty-list-msg">No past events yet.</p>`;
            return;
        }
        pastEvents.forEach(event => {
            const card = createCard(event, true);
            list.appendChild(card);
        });
    };

    const createCard = (event, isPast = false) => {
        const card = document.createElement('div');
        card.className = 'countdown-card';
        card.dataset.id = event.id;
        
        const targetDateObj = new Date(event.date);
        const hasTime = targetDateObj.getHours() !== 0 || targetDateObj.getMinutes() !== 0 || targetDateObj.getSeconds() !== 0;
        const dateOptions = {
            year: 'numeric', month: 'long', day: 'numeric'
        };
        if (hasTime) {
            dateOptions.hour = 'numeric';
            dateOptions.minute = 'numeric';
        }
        const formattedDate = targetDateObj.toLocaleDateString('en-US', dateOptions);

        // ensure start timestamp exists for progress calculations
        if (!event.start) {
            event.start = event.createdAt || new Date().toISOString();
            // not strictly necessary to save every render, but persist for newly created events
            try { saveEvents(); } catch (e) { /* ignore */ }
        }

        let timerHtml = '';
        if (!isPast) {
            const r = 45;
            const c = 2 * Math.PI * r;
            timerHtml = `
            <div class="timer">
                <div class="time-unit"><div class="flipper" data-days></div><span class="label">Days</span></div>
                <div class="time-unit"><div class="flipper" data-hours></div><span class="label">Hours</span></div>
                <div class="time-unit"><div class="flipper" data-minutes></div><span class="label">Minutes</span></div>
                <div class="time-unit"><div class="flipper" data-seconds></div><span class="label">Seconds</span></div>
            </div>
            <div class="ring-container">
                <svg class="countdown-ring" viewBox="0 0 100 100">
                    <defs>
                        <linearGradient id="grad-${event.id}" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stop-color="var(--weeks-color)" />
                            <stop offset="100%" stop-color="var(--months-color)" />
                        </linearGradient>
                    </defs>
                    <circle class="ring-track" cx="50" cy="50" r="${r}"></circle>
                    <circle class="ring-progress" cx="50" cy="50" r="${r}"
                            stroke="url(#grad-${event.id})"
                            stroke-dasharray="${c} ${c}"
                            stroke-dashoffset="${c}"></circle>
                </svg>
                <div class="ring-content">
                    <span class="ring-percent">0%</span>
                    <span class="ring-label">Left</span>
                </div>
            </div>`;
        } else {
            timerHtml = `<p class="event-ended">Ended on ${formattedDate}</p>`;
        }

        card.innerHTML = `
            <div class="countdown-card-content">
                <h3>${event.name}</h3>
                <p class="target-date">${isPast ? '' : formattedDate}</p>
            </div>
            ${timerHtml}
            <div class="time-insights" data-insight-index="0"></div>
            <button class="delete-btn">&times;</button>
        `;

        card.querySelector('.delete-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            deleteEvent(event.id, isPast);
        });

        card.addEventListener('click', (e) => {
            if (!e.target.classList.contains('delete-btn') && !card.classList.contains('deleting')) {
                showEventModal(event.id, isPast);
            }
        });

        if (!isPast) {
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const { width, height } = rect;
                const rotateX = ((y / height) - 0.5) * -10; // Max rotation 5deg
                const rotateY = ((x / width) - 0.5) * 10;  // Max rotation 5deg
                card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.03)`;
            });
    
            card.addEventListener('mouseleave', () => {
                card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale(1)';
            });
        }

        return card;
    };

    // --- Timers ---
    const updateTimers = () => {
        document.querySelectorAll('#countdown-categories .countdown-card').forEach(card => {
            const eventId = parseInt(card.dataset.id);
            const event = events.find(e => e.id === eventId);
            if (!event) return;

            const now = new Date();
            const targetDate = new Date(event.date);
            if (isNaN(targetDate.getTime())) return;

            let diffTime = targetDate - now;
            if (diffTime < 0) {
                render();
                saveEvents();
                return;
            }

            const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diffTime % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diffTime % (1000 * 60)) / 1000);

            // compute elapsed and remaining percent between start -> target
            let startTime = event.start ? new Date(event.start) : null;
            if (!startTime || isNaN(startTime.getTime())) startTime = new Date();
            const totalMs = targetDate - startTime;
            // use high-precision floats so short events show non-zero widths
            let elapsedPercentFloat = 0;
            if (totalMs > 0) elapsedPercentFloat = ((now - startTime) / totalMs) * 100;
            elapsedPercentFloat = Math.max(0, Math.min(100, elapsedPercentFloat));
            const remainingPercentFloat = 100 - elapsedPercentFloat;
            // friendly rounded values for display
            const displayRemainingRounded = remainingPercentFloat > 0 && remainingPercentFloat < 1 ? '<1' : Math.round(remainingPercentFloat);

            const r = 45;
            const c = 2 * Math.PI * r;
            const precisePercent = Math.max(0, Math.min(100, remainingPercentFloat));
            const offset = c - (precisePercent / 100) * c;

            const ringProgress = card.querySelector('.ring-progress');
            const ringPercent = card.querySelector('.ring-percent');

            if (ringProgress) ringProgress.style.strokeDashoffset = offset;
            if (ringPercent) ringPercent.textContent = displayRemainingRounded + '%';

            updateFlipper(card.querySelector('[data-days]'), days);
            updateFlipper(card.querySelector('[data-hours]'), hours);
            updateFlipper(card.querySelector('[data-minutes]'), minutes);
            updateFlipper(card.querySelector('[data-seconds]'), seconds);

            // Update time insights
            const insightsContainer = card.querySelector('.time-insights');
            if (insightsContainer) {
                const today = new Date().toDateString();
                if (card.dataset.insightsGeneratedOn !== today) {
                    card.dataset.insights = JSON.stringify(generateTimeInsights(targetDate));
                    card.dataset.insightsGeneratedOn = today;
                    card.dataset.insightIndex = -1; 
                }

                const lastUpdate = parseInt(card.dataset.insightLastUpdate, 10) || 0;
                if (Date.now() - lastUpdate > 6000) { // Cycle every 6 seconds
                    const insights = JSON.parse(card.dataset.insights || '[]');
                    if (insights.length > 0) {
                        let currentIndex = parseInt(card.dataset.insightIndex, 10);
                        currentIndex = (currentIndex + 1) % insights.length;
                        insightsContainer.textContent = insights[currentIndex];
                        card.dataset.insightIndex = currentIndex;
                    }
                    card.dataset.insightLastUpdate = Date.now();
                }
            }
        });
    };

    const updateFlipper = (flipper, value) => {
        if (!flipper) return;
        const currentValue = parseInt(flipper.dataset.value, 10);
        if (currentValue === value) return;

        const isDays = flipper.hasAttribute('data-days');
        const valStr = isDays ? value.toString() : value.toString().padStart(2, '0');

        flipper.dataset.value = value;
        flipper.innerHTML = `
            <div class="flipper-card front">${valStr}</div>
            <div class="flipper-card back">${valStr}</div>
        `;
    };

    // --- Time Insights ---
    const countWeekdays = (start, end, dayOfWeek) => {
        let count = 0;
        let current = new Date(start);
        current.setHours(0, 0, 0, 0); // Start from the beginning of the day
        while (current <= end) {
            if (current.getDay() === dayOfWeek) {
                count++;
            }
            current.setDate(current.getDate() + 1);
        }
        return count;
    };

    const countWeekends = (start, end) => {
        let weekendDays = 0;
        let current = new Date(start);
        current.setHours(0, 0, 0, 0);
        while (current <= end) {
            const day = current.getDay();
            if (day === 0 || day === 6) { // Sunday or Saturday
                weekendDays++;
            }
            current.setDate(current.getDate() + 1);
        }
        return Math.ceil(weekendDays / 2);
    };

    const generateTimeInsights = (targetDate) => {
        const now = new Date();
        const diffTime = targetDate - now;
        if (diffTime <= 0) return [];

        const insights = [];
        const totalHours = Math.ceil(diffTime / (1000 * 60 * 60));
        const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (totalHours > 24) insights.push(`That's ${totalHours.toLocaleString()} hours away.`);
        
        if (totalDays > 1) {
            const weekends = countWeekends(now, targetDate);
            if (weekends > 0) insights.push(`Only ${weekends} weekend${weekends > 1 ? 's' : ''} left.`);
            
            const mondays = countWeekdays(now, targetDate, 1); // 1 for Monday
            if (mondays > 1) insights.push(`You have ${mondays} Mondays until then.`);
        }

        return insights;
    };

    // --- Event Handlers ---
    eventForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const dateValue = eventDateInput.value;
        const timeValue = eventTimeInput.value || '00:00';
        const targetDate = new Date(`${dateValue}T${timeValue}`);
        if (!dateValue || isNaN(targetDate.getTime())) {
            return;
        }

        if (editMode.active) {
            const event = events.find(ev => ev.id === editMode.eventId);
            if (event) {
                event.name = eventNameInput.value;
                event.date = `${eventDateInput.value}T${timeValue}`;
                event.description = eventDescriptionInput.value;
            }
            resetForm();
        } else {
            const newEvent = {
                id: Date.now() + Math.floor(Math.random() * 1000),
                name: eventNameInput.value,
                date: `${eventDateInput.value}T${timeValue}`,
                description: eventDescriptionInput.value || '',
                createdAt: new Date().toISOString(),
                start: new Date().toISOString()
            };
            events.push(newEvent);
            eventForm.reset();
        }


        events.sort((a, b) => new Date(a.date) - new Date(b.date));
        saveEvents();
        render();
    });

    const resetForm = () => {
        editMode.active = false;
        editMode.eventId = null;
        eventForm.reset();
        document.getElementById('form-buttons').innerHTML = `<button type="submit">Add Countdown</button>`;
    };

    window.deleteEvent = (eventId, isPast) => {
        const card = document.querySelector(`.countdown-card[data-id='${eventId}']`);
        if (!card || deleteTimeouts[eventId]) return;

        if (editMode.active && editMode.eventId === eventId) resetForm();

        card.classList.add('deleting');
        const undoContainer = document.createElement('div');
        undoContainer.className = 'undo-container';
        let countdown = 5;

        undoContainer.innerHTML = `<p>Deleting in <span class="countdown-timer">${countdown}</span>s...</p><button>Undo</button>`;
        card.appendChild(undoContainer);

        const countdownInterval = setInterval(() => {
            countdown--;
            const timerSpan = undoContainer.querySelector('.countdown-timer');
            if (timerSpan) timerSpan.textContent = countdown;
        }, 1000);

        undoContainer.querySelector('button').addEventListener('click', (e) => {
            e.stopPropagation();
            clearTimeout(deleteTimeouts[eventId]);
            clearInterval(countdownInterval);
            delete deleteTimeouts[eventId];
            card.removeChild(undoContainer);
            card.classList.remove('deleting');
        });

        deleteTimeouts[eventId] = setTimeout(() => {
            clearInterval(countdownInterval);
            if (isPast) pastEvents = pastEvents.filter(e => e.id !== eventId);
            else events = events.filter(e => e.id !== eventId);

            saveEvents();
            render();
            delete deleteTimeouts[eventId];
        }, 5000);
    };

    // --- Navigation ---
    currentEventsBtn.addEventListener('click', () => {
        categoriesContainer.classList.remove('hidden');
        pastEventsContainer.classList.add('hidden');
        currentEventsBtn.classList.add('active');
        pastEventsBtn.classList.remove('active');
        document.getElementById('view-switcher').style.visibility = 'visible';
    });

    pastEventsBtn.addEventListener('click', () => {
        categoriesContainer.classList.add('hidden');
        pastEventsContainer.classList.remove('hidden');
        currentEventsBtn.classList.remove('active');
        pastEventsBtn.classList.add('active');
        document.getElementById('view-switcher').style.visibility = 'hidden';
        renderPastEvents();
    });

    window.addEventListener('resize', () => {
        setupCanvas();
        createParticles();
    });

    gridViewBtn.addEventListener('click', () => {
        categoriesContainer.classList.remove('list-view');
        gridViewBtn.classList.add('active');
        listViewBtn.classList.remove('active');
    });

    listViewBtn.addEventListener('click', () => {
        categoriesContainer.classList.add('list-view');
        listViewBtn.classList.add('active');
        gridViewBtn.classList.remove('active');
    });

    // --- Modal ---
    let modalTimerInterval = null;
    const showEventModal = (eventId, isPast) => {
        const event = (isPast ? pastEvents : events).find(e => e.id === eventId);
        if (!event) return;

        document.getElementById('modal-event-name').textContent = event.name;
        document.getElementById('modal-event-description').textContent = event.description || 'No description provided.';
        const modalTimer = document.getElementById('modal-timer');
        const editBtn = document.getElementById('modal-edit-btn');
        clearInterval(modalTimerInterval);

        const updateModalTimer = () => {
            const now = new Date();
            const targetDate = new Date(event.date);
            let diffTime = Math.max(targetDate - now, 0);

            const d = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            const h = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const m = Math.floor((diffTime % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((diffTime % (1000 * 60)) / 1000);

            modalTimer.innerHTML = `
                <div class="time-unit"><div class="flipper" data-value="${d}"><div class="flipper-card back">${d.toString().padStart(2,'0')}</div></div><span class="label">Days</span></div>
                <div class="time-unit"><div class="flipper" data-value="${h}"><div class="flipper-card back">${h.toString().padStart(2,'0')}</div></div><span class="label">Hours</span></div>
                <div class="time-unit"><div class="flipper" data-value="${m}"><div class="flipper-card back">${m.toString().padStart(2,'0')}</div></div><span class="label">Minutes</span></div>
                <div class="time-unit"><div class="flipper" data-value="${s}"><div class="flipper-card back">${s.toString().padStart(2,'0')}</div></div><span class="label">Seconds</span></div>
            `;
        };

        if (isPast) {
            modalTimer.innerHTML = `<p class="event-ended">This event has ended.</p>`;
            editBtn.classList.add('hidden');
        } else {
            updateModalTimer();
            modalTimerInterval = setInterval(updateModalTimer, 1000);
            editBtn.classList.remove('hidden');
            editBtn.onclick = () => enterEditMode(event);
        }

        modal.classList.remove('hidden');
    };

    const enterEditMode = (event) => {
        closeModal();
        editMode.active = true;
        editMode.eventId = event.id;

        const eventDate = new Date(event.date);
        eventNameInput.value = event.name;
        eventDateInput.value = eventDate.toISOString().split('T')[0];
        eventTimeInput.value = eventDate.toTimeString().slice(0, 5);
        eventDescriptionInput.value = event.description || '';

        document.getElementById('form-buttons').innerHTML = `
            <button type="submit">Save Changes</button>
            <button type="button" class="cancel-edit-btn">Cancel</button>
        `;
        document.querySelector('.cancel-edit-btn').addEventListener('click', resetForm);
        eventForm.scrollIntoView({ behavior: 'smooth' });
    };

    const closeModal = () => {
        modal.classList.add('hidden');
        clearInterval(modalTimerInterval);
    };

    modalCloseBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

    // --- Initialization ---
    const savedTheme = localStorage.getItem('theme') || 'dark';
    applyTheme(savedTheme);

    render();
    
    let lastTimerUpdateTime = 0;
    function animationLoop(timestamp) {
        // Update timers roughly every second to ensure accuracy
        if (timestamp - lastTimerUpdateTime >= 990) { // Use 990ms to avoid skipping a beat
            lastTimerUpdateTime = timestamp;
            updateTimers();
        }

        // Draw particles on every frame for smooth animation
        drawParticles();

        requestAnimationFrame(animationLoop);
    }
    requestAnimationFrame(animationLoop);
});
