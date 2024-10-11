chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'schedule_scraped') {
        const schedule = message.data;

        // Authenticate and add each course to Google Calendar
        chrome.identity.getAuthToken({ interactive: false }, function(token) {  // Token should already exist after login
            if (chrome.runtime.lastError) {
                console.error(chrome.runtime.lastError.message);
                return;
            }

            if (!token) {
                console.error("No token retrieved. Cannot proceed.");
                return;
            }

            console.log('OAuth Token Retrieved:', token);

            schedule.forEach(course => {
                const event = {
                    summary: course.courseName,
                    location: course.lecture.location,
                    description: `Instructor: ${course.instructor}`,
                    start: {
                        dateTime: convertToISO(course.lecture.days, course.lecture.time),
                        timeZone: 'America/Los_Angeles'
                    },
                    end: {
                        dateTime: convertToISO(course.lecture.days, course.lecture.time, true),
                        timeZone: 'America/Los_Angeles'
                    },
                    recurrence: [`RRULE:FREQ=WEEKLY;BYDAY=${convertDaysToRecurrence(course.lecture.days)}`]
                };

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
                    console.log('Event created:', data);
                })
                .catch(error => {
                    console.error('Error creating event:', error);
                });

                if (course.discussion) {
                    const discussionEvent = {
                        summary: `${course.courseName} - Discussion`,
                        location: course.discussion.location,
                        description: `Instructor: ${course.instructor}`,
                        start: {
                            dateTime: convertToISO(course.discussion.days, course.discussion.time),
                            timeZone: 'America/Los_Angeles'
                        },
                        end: {
                            dateTime: convertToISO(course.discussion.days, course.discussion.time, true),
                            timeZone: 'America/Los_Angeles'
                        },
                        recurrence: [`RRULE:FREQ=WEEKLY;BYDAY=${convertDaysToRecurrence(course.discussion.days)}`]
                    };

                    fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
                        method: 'POST',
                        headers: {
                            Authorization: `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(discussionEvent)
                    })
                    .then(response => response.json())
                    .then(data => {
                        console.log('Discussion Event created:', data);
                    })
                    .catch(error => {
                        console.error('Error creating discussion event:', error);
                    });
                }
            });
        });
    }
});

// Helper functions (same as before)
