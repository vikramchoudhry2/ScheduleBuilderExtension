chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'schedule_scraped') {
        const schedule = message.data;

        // Authenticate and add each course to Google Calendar
        chrome.identity.getAuthToken({ interactive: true }, function(token) {
            if (chrome.runtime.lastError) {
                console.error(chrome.runtime.lastError.message);
                return;
            }

            schedule.forEach(course => {
                const event = {
                    summary: course.courseName,
                    location: course.lecture.location,
                    description: `Instructor: ${course.instructor}`,
                    start: {
                        dateTime: convertToISO(course.lecture.days, course.lecture.time),
                        timeZone: 'America/Los_Angeles' // Adjust this as necessary
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
            });
        });
    }
});

// Helper function to convert course days and time into ISO format
function convertToISO(days, time, isEnd = false) {
    // Add logic to parse days and time to a valid ISO date string
    const startTime = time.split('-')[0].trim();
    const [hours, minutes, period] = startTime.match(/(\d+):(\d+) (AM|PM)/).slice(1);
    let hour = period === 'PM' && hours !== '12' ? parseInt(hours) + 12 : parseInt(hours);
    const isoDate = new Date();
    isoDate.setHours(hour);
    isoDate.setMinutes(parseInt(minutes));
    return isoDate.toISOString();
}

// Helper function to convert days to recurrence rule
function convertDaysToRecurrence(days) {
    // Convert days like "TR" into a recurrence rule like "TU,TH"
    return days.replace(/T/g, 'TU').replace(/R/g, 'TH').replace(/M/g, 'MO').replace(/W/g, 'WE').replace(/F/g, 'FR');
}
