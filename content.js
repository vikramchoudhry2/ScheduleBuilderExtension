chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'start_scraping') {
        const schedule = [];

        // Get the course title (class name)
        const courseTitle = document.querySelector('.classTitle').innerText;

        // Lecture details
        const lectureType = document.querySelector('.smallTitle').innerText; // "Lecture"
        const lectureTime = document.querySelector('.smallTitle + .height-justified').innerText; // Time
        const lectureDays = document.querySelector('.smallTitle + .height-justified + .height-justified').innerText; // Days (e.g. TR)
        const lectureLocation = document.querySelector('.smallTitle + .height-justified + .height-justified + .height-justified').innerText; // Location (e.g. Hunt 100)

        // Final exam and course drop date
        const finalExamSelector = document.querySelector('.boldTitle'); // Find the bold title containing the final exam info
        const finalExamDate = finalExamSelector && finalExamSelector.innerText.includes('Final Exam') 
            ? finalExamSelector.nextSibling.textContent.trim() 
            : 'No Final Exam Found';

        const dropDate = document.querySelector('.boldTitle + span').innerText; // Drop date next to the bold title "Course Drop Date:"

        // Constructing the course object
        schedule.push({
            courseName: courseTitle,
            type: lectureType,
            time: lectureTime,
            days: lectureDays,
            location: lectureLocation,
            finalExam: finalExamDate,
            dropDate: dropDate
        });

        // Log the scraped schedule (for debugging)
        console.log('Scraped Schedule:', schedule);

        // Send the scraped data back to the background script for processing
        chrome.runtime.sendMessage({ action: 'schedule_scraped', data: schedule });
    }
});
