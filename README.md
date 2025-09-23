NextUp

A sleek and modern web application to create, track, and manage countdowns for your important events. Never miss a deadline or a special occasion again! This application is built with vanilla HTML, CSS, and JavaScript, focusing on a clean user interface, smooth animations, and persistent storage using the browser.

✨ Features

- Create Events: Easily add new countdowns with a name, target date, and an optional description.
- Automatic Categorization: Current events are automatically sorted into categories:
  - Soon: Events less than a week away.
  - Weeks Away: Events between 7 and 30 days away.
  - Months Away: Events more than 30 days away.
- Live Timers: Each event card displays a live, ticking countdown showing the remaining days, hours, minutes, and seconds.
- Past Events Archive: Once an event's date has passed, it is automatically moved to a "Past Events" section for your records.
- Dual Views: Switch between a responsive "Grid View" and a compact List View to see your events the way you prefer.
- Event Details Modal: Click on any event to open a modal with a larger timer and the full event description.
- Undo Deletion: Accidentally deleted an event? No problem. You have 5 seconds to undo the action.
- Persistent Storage: Your events are saved in the browser's `localStorage`, so they'll be there when you come back.
- Responsive Design: A beautiful and functional interface that works seamlessly on desktop, tablet, and mobile devices.

## 🛠️ Tech Stack

- HTML5: For the semantic structure of the application.
- CSS3: For all styling, including:
  - Flexbox and CSS Grid for layout.
  - Custom properties (variables) for easy theming.
  - Keyframe animations for background gradients and UI transitions.
  - Responsive design with media queries.
- JavaScript (ES6+): For all dynamic functionality:
  - DOM manipulation to render and update events.
  - Date and time calculations for the countdown logic.
  - Event handling for user interactions.
  - `localStorage` API for client-side storage.

## 🚀 How to Use

This is a static web project and requires no build process or server.

1.  Clone the repository or download the files (`index.html`, `style.css`, `script.js`).
2.  Open the `index.html` file in your favorite web browser.
3.  Start creating your countdowns!

## ⚙️ How It Works

The application logic is contained within [script.js](script.js).

1.  Data Storage: Events are stored as two arrays, `events` (for current) and `pastEvents` (for expired), which are saved as JSON strings in the browser's `localStorage`.
2.  Rendering: The `render()` function is the core of the display logic. It clears the current lists and re-populates them based on the event arrays. During this process, it checks if any current events have expired and moves them to the `pastEvents` array.
3.  Timers: A `setInterval` calls the `updateTimers()` function every second. This function iterates through all visible countdown cards, calculates the time difference, and updates the numbers in the UI.
4.  User Interaction: Event listeners are used to handle form submissions, view switching, deleting events (with an undo timeout), and displaying the event details modal.
