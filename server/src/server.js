require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenAI } = require("@google/genai");
const { createClient } = require('@supabase/supabase-js');
const serverless = require('serverless-http');

const google_client_id = process.env.GOOGLE_CLIENT_ID || "YOUR_GOOGLE_CLIENT_ID"; // Change this to your google client id
const extension_id = process.env.EXTENSION_ID || "YOUR_EXTENSION_ID"; // Change this to your extension id
const gemini_api_key = process.env.GEMINI_API_KEY || "YOUR_GEMINI_API_KEY"; // Change this to your gemini api key
const supabase_url = process.env.SUPABASE_URL || "YOUR_SUPABASE_URL";
const supabase_anon_key = process.env.SUPABASE_ANON_KEY || "YOUR_SUPABASE_ANON_KEY";
const port = process.env.PORT || 3001;

const app = express();

// Initialize Gemini
const genAI = new GoogleGenAI({apiKey: gemini_api_key});

// Initialize Supabase
const supabase = createClient(supabase_url, supabase_anon_key);

const corOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (origin === `chrome-extension://${extension_id}`) {
            return callback(null, true);
        }

        return callback(new Error(`Why are you trying to hack this....? ${origin}`));
    },
    credentials: true
}


// Middleware
app.use(cors(corOptions));
app.use(express.json({ limit: '15mb' }));

// Google OAuth verification middleware
async function verifyGoogleToken(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ 
                success: false, 
                error: 'Unauthorized: No valid authorization header' 
            });
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        const response_auth = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${token}`);
        const data_auth = await response_auth.json();
        if (data_auth.aud !== google_client_id) {
            return res.status(401).json({ 
                success: false, 
                error: 'Unauthorized: Token not issued for this application' 
            });
        }
        
        // Check if token is expired
        if (data_auth.exp < Date.now() / 1000) {
            return res.status(401).json({ 
                success: false, 
                error: 'Unauthorized: Token has expired' 
            });
        }        // Add user info to request object for use in route handlers

        next();
    } catch (error) {
        return res.status(401).json({ 
            success: false, 
            error: 'Unauthorized: Invalid token' 
        });
    }
}

// Endpoint to process images with Gemini
function getCurrentDateInfo() {
    const now = new Date();
    return {
      currentDate: now.toISOString().split('T')[0],
      currentDay: now.toLocaleDateString('en-US', { weekday: 'long' }),
      currentTime: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    };
}

function cleanResponse(response) {
    try {
        // Clean the response by removing any markdown formatting
        const res = response.text
        const cleanResponse = res.replace(/```json\n?|\n?```/g, '').trim();
        const eventInfo = JSON.parse(cleanResponse);
        return eventInfo;
    } catch (error) {
        const eventInfo = {
            "eventName": null,
            "location": null,
            "date": null,
            "startTime": null,
            "endTime": null,
            "description": null
        }
        return eventInfo;
    }
}


function validateOrChangeDateTime(dateTime) {
    // Check if dateTime is null, undefined, or empty
    const dateInfo = getCurrentDateInfo();
    if (!dateTime || dateTime === null || dateTime === undefined) {
        return dateInfo.currentDate + "T12:00";
    }
    
    // If it's already a valid datetime-local format, return as is
    const datetimeLocalRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
    if (datetimeLocalRegex.test(dateTime)) {
        return dateTime;
    }

    return dateInfo.currentDate + "T12:00";
}

// Test endpoint to verify Google OAuth
app.get('/api/health-check', (req, res) => {
    res.json({
        success: true,
        message: 'Server is running'
    });
});


app.get('/api/test', (req, res) => {
    res.json({
        success: true,
        message: 'Test successful'
    });
});

app.post('/api/multi-event-processing', verifyGoogleToken, async (req, res) => {
    try {
        const { image } = req.body;
        
        if (!image) {
            return res.status(400).json({ error: 'No image provided' });
        }
        // Remove the data URL prefix if present
        const base64Image = image.replace(/^data:image\/\w+;base64,/, '');

        const dateInfo = getCurrentDateInfo();
        const prompt = `Analyze this screenshot of an event page and extract information for ALL events visible in the image. 
        You must return a JSON array containing one or more objects that strictly follow this schema:
    
        [
            {
                "title": string | Enter Title Here,  // The name or title of the event
                "location": string | Enter Location Here,   // The venue or location where the event is taking place
                "startDateTime": string | ${dateInfo.currentDate}T12:00,  // Start datetime in datetime-local format (YYYY-MM-DDTHH:MM). Use ${dateInfo.currentTime} if "now" is mentioned
                "endDateTime": string | ${dateInfo.currentDate}T01:00,    // End datetime in datetime-local format (YYYY-MM-DDTHH:MM). If not specified, set to one hour after startTime
                "description": string | Enter Description Here // A brief description of what the event is about
            }
        ]
    
        Rules:
        1. First, identify how many distinct events are visible in the image
        2. For each event found, create an object following the schema above
        3. All fields must be either a string or datetime-local
        4. Datetimes must be in datetime-local format (YYYY-MM-DDTHH:MM)
        5. If a field's information is not found for an event, set it to the value in the schema
        6. Do not include any additional fields
        7. Do not include any markdown formatting, explanatory text, or code blocks.
        8. If endTime is not specified for an event, calculate it as one hour after startTime
        9. If "today" is mentioned, use ${dateInfo.currentDate}
        10. If "now" is mentioned, use ${dateInfo.currentTime}
        11. If no date is mentioned for an event, use ${dateInfo.currentDate} as the date
        12. Return an empty array [] if no events are found
    
        Focus on extracting only the information that is explicitly visible in the image.
        Return only the JSON array, no additional text, no markdown formatting, no code blocks.`;
        // Initialize the Gemini Pro Vision model
        const result = await genAI.models.generateContent({
            model: "gemini-2.0-flash",
            contents: [
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: base64Image,
              },
            },
            { text: prompt }
          ],
        });

        const eventInfo = cleanResponse(result);
        eventInfo.forEach(event => {
            event.startDateTime = validateOrChangeDateTime(event.startDateTime);
            event.endDateTime = validateOrChangeDateTime(event.endDateTime);
        });
        
        const eventInfoLength = Array.isArray(eventInfo) ? eventInfo.length : 0;
        
        try {
            const { error } = await supabase
                .from('event_processing_logs')
                .insert([
                    {
                        event_count: eventInfoLength,
                    }
                ]);
            
            if (error) {
                console.error('Supabase error:', error);
            }
        } catch (supabaseError) {
            console.error('Error sending to Supabase:', supabaseError);
        }
        
        return res.json({ 
            success: true, 
            result: Array.isArray(eventInfo) ? eventInfo : [eventInfo]
        });
    } catch (error) {
        return res.status(500).json({ 
            success: false, 
            result: []
        });
    }
});

app.post('/api/add-time', verifyGoogleToken, async (req, res) => {
    const { duration } = req.body;

    try {
        const { error } = await supabase
            .from('event_total_saved_times')
            .insert([
                {
                    duration: duration,
                }
            ]);
        if (error) {
            console.error('Supabase error:', error);
            return res.status(500).json({ success: false });
        }
    } catch (supabaseError) {
        console.error('Error sending to Supabase:', supabaseError);
        return res.status(500).json({ success: false });
    }
    return res.json({ success: true });
});


app.listen(port, () => {}); // need to use serverless-http for deployment on lambda, this is for local development