// scraping course data func
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'start_scraping') {
        if (window.isScraping) return;
        window.isScraping = true;

        const schedule = [];
        const startDate = message.startDate; // get start date from popup
        console.log("Received startDate in content.js:", startDate);

        let encounteredInvalid = false;

        setTimeout(() => {
            const courseItems = document.querySelectorAll('.CourseItem');
            if (courseItems.length === 0) {
                console.error('No courses found on the page');
                window.isScraping = false;
                return;
            }

            courseItems.forEach(course => {
                if (encounteredInvalid) return;

                const courseTitleElement = course.querySelector('.classTitle');
                const courseTitle = courseTitleElement ? courseTitleElement.innerText : 'N/A';
                const instructorElement = course.querySelector('a[href^="mailto:"]');
                const instructor = instructorElement ? instructorElement.innerText : 'N/A';

                const lectureElement = course.querySelector('.meeting');
                let lectureType = 'N/A', lectureTime = 'N/A', lectureDays = 'N/A', lectureLocation = 'N/A';
                if (lectureElement) {
                    const lectureTypeElement = lectureElement.querySelector('.smallTitle');
                    lectureType = lectureTypeElement ? lectureTypeElement.innerText : 'N/A';
                    const timeElements = lectureElement.querySelectorAll('.height-justified');
                    lectureTime = timeElements[1] ? timeElements[1].innerText : 'N/A';
                    lectureDays = timeElements[2] ? timeElements[2].innerText : 'N/A';
                    lectureLocation = timeElements[3] ? timeElements[3].innerText : 'N/A';
                }

                const discussionElement = course.querySelectorAll('.meeting')[1];
                let discussionType = 'N/A', discussionTime = 'N/A', discussionDays = 'N/A', discussionLocation = 'N/A';
                if (discussionElement) {
                    const discussionTypeElement = discussionElement.querySelector('.smallTitle');
                    discussionType = discussionTypeElement ? discussionTypeElement.innerText : 'N/A';
                    const discussionTimeElements = discussionElement.querySelectorAll('.height-justified');
                    discussionTime = discussionTimeElements[1] ? discussionTimeElements[1].innerText : 'N/A';
                    discussionDays = discussionTimeElements[2] ? discussionTimeElements[2].innerText : 'N/A';
                    discussionLocation = discussionTimeElements[3] ? discussionTimeElements[3].innerText : 'N/A';
                }

                const isValidCourse = courseTitle !== 'N/A' && lectureTime !== 'N/A' && lectureDays !== 'N/A' && lectureLocation !== 'N/A';

                if (isValidCourse) {
                    schedule.push({
                        courseName: courseTitle,
                        instructor: instructor,
                        lecture: {
                            type: lectureType,
                            time: lectureTime,
                            days: lectureDays,
                            location: lectureLocation
                        },
                        discussion: discussionElement ? {
                            type: discussionType,
                            time: discussionTime,
                            days: discussionDays,
                            location: discussionLocation
                        } : null
                    });
                } else {
                    encounteredInvalid = true;
                }
            });

            console.log('Final Valid Courses:', schedule);
            chrome.runtime.sendMessage({ action: 'schedule_scraped', data: schedule, startDate: startDate });
            window.isScraping = false;
        }, 2000);
    }
});
