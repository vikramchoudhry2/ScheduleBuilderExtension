chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'schedule_scraped') {
        const schedule = message.data;

        // Authenticate and add each course to Google Calendar
        chrome.identity.getAuthToken({ interactive: true }, function(token) {
            if (chrome.runtime.lastError) {
                console.error(chrome.runtime.lastError.message);
                return;
            }

            if (!token) {
                console.error("No token retrieved. Cannot proceed.");
                return;
            }

            console.log('OAuth Token Retrieved:', token); // Make sure the token is retrieved correctly

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

                // Handle the discussion separately if it exists
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

// Helper function to convert course days and time into ISO format
function convertToISO(days, time, isEnd = false) {
    // Parse time to ISO string format
    const startTime = time.split('-')[0].trim();
    const [hours, minutes, period] = startTime.match(/(\d+):(\d+) (AM|PM)/).slice(1);
    let hour = period === 'PM' && hours !== '12' ? parseInt(hours) + 12 : parseInt(hours);
    const isoDate = new Date();
    isoDate.setHours(hour);
    isoDate.setMinutes(parseInt(minutes));

    if (isEnd) {
        // Add an hour for the end time (or adjust as necessary)
        isoDate.setHours(isoDate.getHours() + 1);
    }

    return isoDate.toISOString();
}

// Helper function to convert days to recurrence rule
function convertDaysToRecurrence(days) {
    return days.replace(/T/g, 'TU').replace(/R/g, 'TH').replace(/M/g, 'MO').replace(/W/g, 'WE').replace(/F/g, 'FR');
}
