async function addEventToCalendar(eventData) {
    try {
        const { token } = await chrome.identity.getAuthToken({interactive: true});

        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

        const adjustedStartDate = eventData.startDateTime + ":00";
        const adjustedEndDate = eventData.endDateTime + ":00";

        const event = {
          summary: eventData.title,
          description: eventData.description,
          start: {
            dateTime: adjustedStartDate,
            timeZone: timeZone
          },
          end: {
            dateTime: adjustedEndDate,
            timeZone: timeZone
          },
          location: eventData.location
        };

        const response = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
          method: "POST",
          headers: {
            Authorization: "Bearer " + token,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(event)
        });
        const data = await response.json();
        if (data.status === "confirmed") {
            return { reply: "success", data: data };
        }
        else if (data.error) {
            return { reply: "error", data: data.error };
        }
        return { reply: "success", data: data };
    } catch (error) {
        return { reply: "error", data: error };
    }
}

async function testsAddEventToCalendar() {

  console.log("Token: ", token);

  const event = {
        summary: "Test Event",
        description: "Test Description",
        start: {
          dateTime: "2025-06-18T10:00:00",
          timeZone: "America/New_York"
        },
        end: {
          dateTime: "2025-06-18T11:00:00",
          timeZone: "America/New_York"
        },
        location: "Test Location"
      };
      console.log("event that is being passed into api in calendar.js: ", event);
  
      const response = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(event)
      });

      const data = await response.json();
      console.log("Data from testsAddEventToCalendar:", data);
      return data;
}
/*

(async () => {
    for (let i = 0; i < 1; i++) {
        const data = await testsAddEventToCalendar();
        console.log("Data from testsAddEventToCalendar:", data);
    }
})();
*/
