chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'schedule_scraped') {
        const schedule = message.data;

        // Revoke the token to force OAuth popup
        chrome.identity.getAuthToken({ interactive: false }, function(token) {
            if (token) {
                chrome.identity.removeCachedAuthToken({ token: token }, function() {
                    console.log('Token revoked. Requesting new token...');

                    // Request a new token with `prompt=consent` to force account selection
                    requestOAuthWithConsent(schedule);
                });
            } else {
                // No token was cached, so start OAuth flow directly
                requestOAuthWithConsent(schedule);
            }
        });
    }
});

function requestOAuthWithConsent(schedule) {
    const oauthUrl = `https://accounts.google.com/o/oauth2/auth?client_id=${YOUR_CLIENT_ID}&response_type=token&scope=https://www.googleapis.com/auth/calendar&redirect_uri=${chrome.identity.getRedirectURL()}&prompt=consent`;

    // Launch a web auth flow with consent screen
    chrome.identity.launchWebAuthFlow(
        { url: oauthUrl, interactive: true },
        function (responseUrl) {
            if (chrome.runtime.lastError || !responseUrl) {
                console.error('OAuth flow error:', chrome.runtime.lastError);
                return;
            }

            // Extract the token from the response URL
            const token = responseUrl.match(/access_token=([^&]*)/)[1];
            console.log('OAuth Token Retrieved:', token);

            // Now add the courses to Google Calendar
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
        }
    );
}

// Helper function to convert course days and time into ISO format
function convertToISO(days, time, isEnd = false) {
    const startTime = time.split('-')[0].trim();
    const [hours, minutes, period] = startTime.match(/(\d+):(\d+) (AM|PM)/).slice(1);
    let hour = period === 'PM' && hours !== '12' ? parseInt(hours) + 12 : parseInt(hours);
    const isoDate = new Date();
    isoDate.setHours(hour);
    isoDate.setMinutes(parseInt(minutes));

    if (isEnd) {
        isoDate.setHours(isoDate.getHours() + 1);
    }

    return isoDate.toISOString();
}

// Helper function to convert days to recurrence rule
function convertDaysToRecurrence(days) {
    return days.replace(/T/g, 'TU').replace(/R/g, 'TH').replace(/M/g, 'MO').replace(/W/g, 'WE').replace(/F/g, 'FR');
}
