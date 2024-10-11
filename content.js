chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'start_scraping') {
        const schedule = [];
        let encounteredInvalid = false;  // To detect when we hit a block of invalid courses

        // Wait 2 seconds for the page to load (adjust as needed)
        setTimeout(() => {
            const courseItems = document.querySelectorAll('.CourseItem');
            if (courseItems.length === 0) {
                console.error('No courses found on the page');
                return;
            }

            courseItems.forEach(course => {
                if (encounteredInvalid) {
                    // Once we hit an invalid course block, stop further processing
                    return;
                }

                // Scrape the course title
                const courseTitleElement = course.querySelector('.classTitle');
                const courseTitle = courseTitleElement ? courseTitleElement.innerText : 'N/A';

                // Scrape the instructor's email (if available)
                const instructorElement = course.querySelector('a[href^="mailto:"]');
                const instructor = instructorElement ? instructorElement.innerText : 'N/A';

                // Scrape the lecture details
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

                // Scrape the discussion section (if available)
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

                // Check if most of the details are valid (not 'N/A')
                const isValidCourse = courseTitle !== 'N/A' && lectureTime !== 'N/A' && lectureDays !== 'N/A' && lectureLocation !== 'N/A';

                if (isValidCourse) {
                    // Add the valid course to the schedule
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
                    // If we encounter an invalid course, set the flag to stop further parsing
                    encounteredInvalid = true;
                }
            });

            // Log the final valid courses for debugging
            console.log('Final Valid Courses:', schedule);

            // Send the scraped valid data back to the background script for further processing
            chrome.runtime.sendMessage({ action: 'schedule_scraped', data: schedule });
        }, 2000); // Adjust the delay as necessary to allow the page to load fully
    }
});
