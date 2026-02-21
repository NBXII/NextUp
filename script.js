document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const eventForm = document.getElementById('event-form');
    const eventNameInput = document.getElementById('event-name');
    const eventDateInput = document.getElementById('event-date');
    const eventDescriptionInput = document.getElementById('event-description');
    const categoriesContainer = document.getElementById('countdown-categories');
    const pastEventsContainer = document.getElementById('past-events-container');
    const gridViewBtn = document.getElementById('grid-view-btn');
    const listViewBtn = document.getElementById('list-view-btn');
    const currentEventsBtn = document.getElementById('current-events-btn');
    const pastEventsBtn = document.getElementById('past-events-btn');
    const modal = document.getElementById('event-modal');
    const modalCloseBtn = document.getElementById('modal-close-btn');

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

        const formattedDate = new Date(event.date).toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric'
        });

        // ensure start timestamp exists for progress calculations
        if (!event.start) {
            event.start = event.createdAt || new Date().toISOString();
            // not strictly necessary to save every render, but persist for newly created events
            try { saveEvents(); } catch (e) { /* ignore */ }
        }

        let timerHtml = '';
        if (!isPast) {
            timerHtml = `
            <div class="timer">
                <div class="time-unit"><div class="flipper" data-days></div><span class="label">Days</span></div>
                <div class="time-unit"><div class="flipper" data-hours></div><span class="label">Hours</span></div>
                <div class="time-unit"><div class="flipper" data-minutes></div><span class="label">Minutes</span></div>
                <div class="time-unit"><div class="flipper" data-seconds></div><span class="label">Seconds</span></div>
            </div>
            <div class="progress-container" aria-hidden="false">
              <div class="progress-fill" style="width:0%"></div>
              <div class="progress-wave" style="width:0%"></div>
              <div class="progress-percent">0%</div>
              <div class="progress-info"><span class="progress-remaining">100% left</span><span class="progress-rate">−0%/day</span></div>
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

            // compute progress percent between start -> target
            let startTime = event.start ? new Date(event.start) : null;
            if (!startTime || isNaN(startTime.getTime())) startTime = new Date();
            const totalMs = targetDate - startTime;
            let percent = 0;
            if (totalMs > 0) percent = Math.round(((now - startTime) / totalMs) * 100);
            percent = Math.max(0, Math.min(100, percent));

            const progressFill = card.querySelector('.progress-fill');
            const progressWave = card.querySelector('.progress-wave');
            const percentLabel = card.querySelector('.progress-percent');
            if (progressFill) progressFill.style.width = percent + '%';
            if (progressWave) progressWave.style.width = percent + '%';
            if (percentLabel) percentLabel.textContent = percent + '%';

            // remaining percent and drop-rate (approx per day or per hour)
            const remaining = Math.max(0, 100 - percent);
            const remainingLabel = card.querySelector('.progress-remaining');
            if (remainingLabel) remainingLabel.textContent = `${remaining}% left`;
            const rateLabel = card.querySelector('.progress-rate');
            if (rateLabel) {
                const remainingMs = targetDate - now;
                if (remainingMs <= 0) rateLabel.textContent = '—';
                else {
                    const daysLeft = remainingMs / (1000*60*60*24);
                    if (daysLeft >= 1) {
                        const perDay = (remaining / daysLeft) || 0;
                        rateLabel.textContent = `≈ ${perDay.toFixed(2)}%/day`;
                    } else {
                        const hoursLeft = remainingMs / (1000*60*60) || 1;
                        const perHour = (remaining / hoursLeft) || 0;
                        rateLabel.textContent = `≈ ${perHour.toFixed(2)}%/hr`;
                    }
                }
            }

            updateFlipper(card.querySelector('[data-days]'), days);
            updateFlipper(card.querySelector('[data-hours]'), hours);
            updateFlipper(card.querySelector('[data-minutes]'), minutes);
            updateFlipper(card.querySelector('[data-seconds]'), seconds);
        });
    };

    const updateFlipper = (flipper, value) => {
        if (!flipper) return;
        const currentValue = parseInt(flipper.dataset.value) || -1;
        if (currentValue !== value) {
            const valStr = value.toString().padStart(flipper.dataset.value > 99 ? 3 : 2, '0');
            flipper.dataset.value = value;
            flipper.innerHTML = `
                <div class="flipper-card front">${valStr}</div>
                <div class="flipper-card back">${valStr}</div>
            `;
        }
    };

    // --- Event Handlers ---
    eventForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const dateValue = eventDateInput.value;
        const targetDate = new Date(`${dateValue}T00:00:00`);
        if (!dateValue || isNaN(targetDate.getTime())) {
            // alert("Please enter a valid date.");
            return;
        }

        if (editMode.active) {
            const event = events.find(ev => ev.id === editMode.eventId);
            if (event) {
                event.name = eventNameInput.value;
                event.date = `${eventDateInput.value}T00:00:00`;
                event.description = eventDescriptionInput.value;
            }
            resetForm();
        } else {
            const newEvent = {
                id: Date.now() + Math.floor(Math.random() * 1000),
                name: eventNameInput.value,
                date: `${eventDateInput.value}T00:00:00`,
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

        eventNameInput.value = event.name;
        eventDateInput.value = new Date(event.date).toISOString().split('T')[0];
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
    render();
    setInterval(updateTimers, 1000);
});

