// handle messages from content or popup scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'schedule_scraped') {
        const schedule = message.data;
        const startDate = new Date(message.startDate); 

        if (isNaN(startDate.getTime())) {
            console.error("Invalid start date provided to background.js:", message.startDate);
            return;
        }

        console.log("Received valid startDate in background.js:", startDate);
        authenticateAndProcessSchedule(schedule, startDate);
    }
});

// auth flow -> run process schedule function
function authenticateAndProcessSchedule(schedule, startDate) {
    chrome.identity.getAuthToken({ interactive: true }, (token) => {
        if (chrome.runtime.lastError || !token) {
            console.error('Authentication failed:', chrome.runtime.lastError.message);
            notifyUser('Authentication failed. Please try again.');
            return;
        }

        console.log('Token retrieved:', token);
        processSchedule(schedule, token, startDate);
    });
}

// get each course and create unique events for lectures and discussions
function processSchedule(schedule, token, startDate) {
    const uniqueEvents = new Set(); // prevent duplicate with a set

    schedule.forEach(course => {
        const lectureKey = `${course.courseName}-Lecture`;
        const discussionKey = `${course.courseName}-Discussion`;

        // create unique lec and disc events
        if (course.lecture && !uniqueEvents.has(lectureKey)) {
            uniqueEvents.add(lectureKey);
            const lectureEvent = createEvent(course.courseName, course.instructor, course.lecture, token, startDate);
            if (lectureEvent) {
                sendCalendarEvent(lectureEvent, token, lectureKey);
            }
        }

        if (course.discussion && !uniqueEvents.has(discussionKey)) {
            uniqueEvents.add(discussionKey);
            const discussionEvent = createEvent(course.courseName, course.instructor, course.discussion, token, startDate);
            if (discussionEvent) {
                sendCalendarEvent(discussionEvent, token, discussionKey);
            }
        }
    });
}

// send the event to gcal API and format
function sendCalendarEvent(event, token, eventName) {
    fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(event)
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            console.error('Error creating event:', data.error.message || data.error);
            notifyUser(`Failed to add ${eventName} to Google Calendar: ${data.error.message}`);
        } else {
            console.log('Event created:', data);
            notifyUser(`Successfully added ${eventName} to Google Calendar.`);
        }
    })
    .catch(error => {
        console.error('Error creating event:', error);
        notifyUser(`Failed to add ${eventName} to Google Calendar.`);
    }, 100);
}

// display notification to user
function notifyUser(message) {
    chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon.png', // icon.png just a filler shit not a thing yet
        title: 'Google Calendar Integration',
        message: message
    });
}

// create event object to send gcal api, limit to 10 weeks
function createEvent(courseName, instructor, session, token, startDate) {
    try {
        const startDateTime = convertToISO(session.days, session.time, startDate);
        const endDateTime = convertToISO(session.days, session.time, startDate, true);

        if (!startDateTime || !endDateTime) {
            console.error(`Skipping event creation for ${courseName} due to invalid start or end time.`);
            return null; 
        }

        // recurrence rule to cover the quarter
        const recurrenceRule = `RRULE:FREQ=WEEKLY;COUNT=10;BYDAY=${convertDaysToRecurrence(session.days)}`;
        console.log(`Creating event for ${courseName} (${session.type}) with recurrence rule: ${recurrenceRule}`);
        
        return {
            summary: `${courseName} - ${session.type}`,
            location: session.location,
            description: `Instructor: ${instructor}`,
            start: {
                dateTime: startDateTime,
                timeZone: 'America/Los_Angeles'
            },
            end: {
                dateTime: endDateTime,
                timeZone: 'America/Los_Angeles'
            },
            recurrence: [recurrenceRule]
        };
    } catch (error) {
        console.error("Error creating event data:", error);
        return null;
    }
}

// convert date/time to an ISO format that gcal requires
function convertToISO(days, time, startDate, isEnd = false) {
    // have it start from the start date we get from popup
    if (isNaN(startDate.getTime())) {
        console.error("Invalid start date provided to convertToISO.");
        return null;
    }

    const timeParts = time.split('-');
    const timeString = isEnd && timeParts[1] ? timeParts[1].trim() : timeParts[0].trim();

    // parse the time string
    const timeMatch = timeString.match(/(\d+):(\d+) (AM|PM)/);
    if (!timeMatch) {
        console.error(`Invalid time format for ${timeString} in convertToISO. Expected format: HH:MM AM/PM`);
        return null;
    }

    const [hours, minutes, period] = timeMatch.slice(1);
    let hour = parseInt(hours) % 12;
    if (period === 'PM') hour += 12;

    const targetDate = new Date(startDate);
    const dayMap = { M: 1, T: 2, W: 3, R: 4, F: 5 };
    const targetDay = dayMap[days[0]];

    const daysUntilNext = (targetDay - startDate.getDay() + 7) % 7 || 7;
    targetDate.setDate(startDate.getDate() + daysUntilNext);
    targetDate.setHours(hour, parseInt(minutes), 0, 0);

    console.log("convertToISO target date:", targetDate);
    return targetDate.toISOString();
}

// convert schedule builder days to gcal recurrence format
function convertDaysToRecurrence(days) {
    const dayMap = { M: 'MO', T: 'TU', W: 'WE', R: 'TH', F: 'FR' };
    return days.split('').map(day => dayMap[day] || '').join(',');
}
