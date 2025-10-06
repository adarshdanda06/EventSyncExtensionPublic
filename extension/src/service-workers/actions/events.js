function captureVisibleTab () {
    return new Promise((resolve, reject) => {
        chrome.tabs.captureVisibleTab(null, null, (dataUrl) => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve(dataUrl);
            }
        });
    });
};


async function getEventsFromImage () {

    try {
        const baseUrl = "YOUR_SERVER_URL" // Change this to your server url
        const { token } = await chrome.identity.getAuthToken({interactive: true});

        
        const dataUrl = await captureVisibleTab();
        
        const startTime = Date.now();
        
        const response = await fetch(`${baseUrl}/api/multi-event-processing`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ image: dataUrl }),
        });
    
        const data = await response.json();
        
        // Remove timer rn, add whn deploy
        // const endTime = Date.now();
        // const requestDuration = endTime - startTime;
 
        // try {
        //     await fetch(`${baseUrl}/api/add-time`, {
        //         method: 'POST',
        //         headers: {
        //             'Content-Type': 'application/json',
        //             'Authorization': `Bearer ${token}`
        //         },
        //         body: JSON.stringify({ 
        //             duration: requestDuration,
        //         }),
        //     });
        // } catch (timingError) {
        //     console.error('Failed to send timing data:', timingError);
        // }
        
        if (data.success) {
            return { reply: "success", data: data };
        } else {
            return { reply: "error", data: [] };
        }
    } catch (error) {
        return { reply: "error", data: [] };
    }
};