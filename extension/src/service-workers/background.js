importScripts("./actions/events.js", "./actions/calendar.js");

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "get-events-from-image") {
        (async () => {
            try {
                const result = await getEventsFromImage();
                const { reply, data } = result;
                sendResponse({ reply, data });
            } catch (error) {
                sendResponse({ reply: "error", data: "catch error" });
            }
        })();
        return true;
    }
    if (message.action === "add-event-to-calendar") {
        (async () => {
            try {
                const result = await addEventToCalendar(message.eventData);
                sendResponse(result);
            } catch (error) {
                sendResponse({ reply: "error", data: "catch error" });
            }
        })();
        return true;
    }
    sendResponse({ reply: "error", data: "test2" });

    return true;
});