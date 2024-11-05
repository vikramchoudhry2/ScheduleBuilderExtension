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
            return;
        }

        console.log('Token retrieved:', token);
        processSchedule(schedule, token, startDate);
    });
}

// get each course and create unique events for lectures and discussions
function processSchedule(schedule, token, startDate) {
    const uniqueEvents = new Set();

    schedule.forEach((course, index) => {
        const lectureKey = `${course.courseName}-Lecture`;
        const discussionKey = `${course.courseName}-Discussion`;

        // create unique lec and disc events
        if (course.lecture && !uniqueEvents.has(lectureKey)) {
            uniqueEvents.add(lectureKey);
            const lectureEvent = createEvent(course.courseName, course.instructor, course.lecture, startDate);
            if (lectureEvent) {
                setTimeout(() => sendCalendarEvent(lectureEvent, token, lectureKey), index * 200);
            }
        }

        if (course.discussion && !uniqueEvents.has(discussionKey)) {
            uniqueEvents.add(discussionKey);
            const discussionEvent = createEvent(course.courseName, course.instructor, course.discussion, startDate);
            if (discussionEvent) {
                setTimeout(() => sendCalendarEvent(discussionEvent, token, discussionKey), (index + 1) * 200);
            }
        }
    });
}

// create the event and recurrence rule to throw everything onto the cal
function createEvent(courseName, instructor, session, startDate) {
    try {
        const startDateTime = convertToISO(session.days, session.time, startDate);
        const endDateTime = convertToISO(session.days, session.time, startDate, true);

        if (!startDateTime || !endDateTime) {
            console.error(`Skipping event creation for ${courseName} due to invalid start or end time.`);
            return null; 
        }

        // Calculate the UNTIL date, 10 weeks from the start date we gave it
        const untilDate = new Date(startDateTime);
        untilDate.setDate(untilDate.getDate() + 7 * 10);
        const untilDateISO = untilDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

        // Use WEEKLY frequency with UNTIL date for exactly 10 weeks
        const recurrenceRule = `RRULE:FREQ=WEEKLY;UNTIL=${untilDateISO};BYDAY=${convertDaysToRecurrence(session.days)}`;
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


// send an event to gcal
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
        } else {
            console.log('Event created:', data);
        }
    })
    .catch(error => {
        console.error('Error creating event:', error);
    });
}

// ensure the first instance of a recurring event aligns with the correct day
function convertToISO(days, time, startDate, isEnd = false) {
    const timeParts = time.split('-');
    const timeString = isEnd && timeParts[1] ? timeParts[1].trim() : timeParts[0].trim();

    const timeMatch = timeString.match(/(\d+):(\d+) (AM|PM)/);
    if (!timeMatch) {
        console.error(`Invalid time format: ${timeString}`);
        return null;
    }

    let [_, hours, minutes, period] = timeMatch;
    hours = parseInt(hours) + (period === 'PM' && hours !== "12" ? 12 : 0);

    const targetDate = new Date(startDate);
    const dayMap = { M: 1, T: 2, W: 3, R: 4, F: 5 };
    const targetDay = dayMap[days[0]];

    const daysUntilNext = (targetDay - startDate.getDay() + 7) % 7;
    targetDate.setDate(startDate.getDate() + daysUntilNext);
    targetDate.setHours(hours, parseInt(minutes), 0, 0);

    return targetDate.toISOString();
}

// conver to gcal recurrence format
function convertDaysToRecurrence(days) {
    const dayMap = { M: 'MO', T: 'TU', W: 'WE', R: 'TH', F: 'FR' };
    return days.split('').map(day => dayMap[day] || '').join(',');
}
