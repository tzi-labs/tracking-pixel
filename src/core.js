// src/core.js
import { Cookie, Helper, Browser, Url } from './utils.js';

// --- Constants (from Vite define plugin) ---
const PIXEL_FUNC_NAME = __PIXEL_FUNC_NAME__;
const PIXEL_ENDPOINT = __PIXEL_ENDPOINT__;
const VERSION = __VERSION__;
// TRACKER_ID is also available via __TRACKER_ID__ if needed globally

// --- Configuration Store ---
export const Config = {
  id: '', // The website/app Tracker ID, set via init()
  version: VERSION,
  params: {}, // Custom parameters to add to every request
  pageLoadOnce: false, // Ensure 'pageload' fires only once
  pageCloseOnce: false, // Ensure 'pageclose' fires only once
  lastExternalHost: null, // Store last clicked external link info
};

// --- Initial Setup ---
// Called once the main script loads (from index.js)
export function initQueue() {
    console.log('[core.js] initQueue() called.');
    // Set/update the user ID cookie (lasting 2 years)
    const uidCookieName = 'uid';
    const uidExists = Cookie.exists(uidCookieName);
    const currentUid = uidExists ? Cookie.get(uidCookieName) : Helper.guid();
    Cookie.set(uidCookieName, currentUid, 2 * 365 * 24 * 60); // Set/update cookie with 2-year expiry

    // Persist UTM parameters from URL into a session cookie
    Cookie.setUtms();

    console.log("Initial setup (UID cookie, UTMs) complete.");
}


// --- Command Processor ---
// Handles calls like strk('init', 'ID-123'), strk('event', 'click'), etc.
export function processCommand(method, value, optional) {
    console.log('[core.js] processCommand() received: method=', method, ' value=', value, ' optional=', optional);
    // Convert arguments object to array - REMOVED
    // const [method, value, optional] = Array.from(args); 

    if (method === 'init') {
        if (value) {
            Config.id = value;
            console.log(`[core.js] Tracker initialized with ID: ${Config.id}`);
        } else {
            console.error("[core.js] Initialization command 'init' requires a tracker ID.");
        }
    } else if (method === 'param') {
        if (value && typeof optional !== 'undefined') {
            // Store custom parameters. The value will be evaluated when the pixel is sent.
            Config.params[value] = () => Helper.optionalData(optional); // Store function to resolve data later
            console.log(`[core.js] Custom parameter set: ${value}`);
        } else {
            console.error("[core.js] Command 'param' requires a key and a value.");
        }
    } else if (method === 'event') {
        handleEvent(value, optional);
    } else {
        console.warn(`[core.js] Unknown command received: ${method}`);
    }
}

// --- Event Handling ---
function handleEvent(eventName, eventData) {
    console.log(`[core.js] handleEvent() called: eventName=${eventName}, eventData=`, eventData);
    if (!eventName) {
        console.error("Event command requires an event name.");
        return;
    }

    // Get the correct timestamp
    // For 'pageload', use the initial timestamp from the snippet if available.
    // For all other events, use the current time.
    const timestamp = (eventName === 'pageload' && window[PIXEL_FUNC_NAME] && window[PIXEL_FUNC_NAME].t)
                        ? window[PIXEL_FUNC_NAME].t
                        : Helper.now();

    // Special handling for automatic events
    if (eventName === 'pageload') {
        if (!Config.pageLoadOnce) {
            Config.pageLoadOnce = true;
            sendPayload(eventName, timestamp, eventData);
        } else {
            console.log("'pageload' event already sent for this page view.");
        }
    } else if (eventName === 'pageclose') {
        // 'pageclose' is handled by the listener in index.js which calls this.
        // We might add extra data here, like the last clicked external link.
        let closeData = eventData; // Start with any provided data
        // If a recent external link click occurred, add it.
        if (Config.lastExternalHost && (Helper.now() - Config.lastExternalHost.time) < 5000) { // 5 seconds threshold
            const externalLinkData = { external_link: Config.lastExternalHost.link };
            // Merge link data with existing data if possible, prioritize link data.
            // Ensure closeData is an object if we need to merge
            if (typeof closeData !== 'object' || closeData === null) {
                closeData = {};
            }
            // Ensure externalLinkData doesn't overwrite existing keys unless intended
            closeData = { ...closeData, ...externalLinkData }; 
        }
        sendPayload(eventName, timestamp, closeData); // Send potentially augmented data
    } else {
        // Handle custom events directly
        sendPayload(eventName, timestamp, eventData);
    }
}


// --- Payload Sending Logic ---
function sendPayload(event, timestamp, optionalData) {
    console.log(`[core.js] sendPayload() called: event=${event}, timestamp=${timestamp}, optionalData=`, optionalData);
    if (!Config.id) {
        console.warn("[core.js] Tracker not initialized with an ID. Payload not sent.");
        return;
    }

    const dataObject = {};
    // Note: optionalData should be processed *before* assigning to ed
    // It might be a string needing parsing, or already an object.
    let processedEventData;
    try {
        // Attempt to parse if it looks like JSON, otherwise keep as is
        if (typeof optionalData === 'string' && (optionalData.startsWith('{') || optionalData.startsWith('['))) {
            processedEventData = JSON.parse(optionalData);
        } else {
            processedEventData = optionalData; // Keep as is (string, number, boolean, null, object)
        }
    } catch (e) {
        console.warn("Could not parse event data as JSON, sending as string:", optionalData);
        processedEventData = optionalData; // Send original string on parse error
    }

    // Define base attributes function map
    const baseAttributes = {
        id: () => Config.id,                   // Website/Tracker ID
        uid: () => Cookie.get('uid'),           // User ID from cookie
        ev: () => event,                       // Event name
        ed: () => processedEventData,          // Event data (potentially parsed object or original value)
        v: () => Config.version,               // Tracker version
        dl: () => window.location.href,        // Document location (URL)
        rl: () => document.referrer,           // Referrer URL
        ts: () => timestamp,                   // Timestamp (provided)
        de: () => document.characterSet || document.charset, // Document encoding
        sr: () => `${window.screen.width}x${window.screen.height}`, // Screen resolution
        vp: () => `${window.innerWidth}x${window.innerHeight}`, // Viewport size
        cd: () => window.screen.colorDepth,     // Color depth
        dt: () => document.title,              // Document title
        bn: () => Browser.nameAndVersion(),    // Browser name and version
        md: () => Browser.isMobile(),          // Mobile device? (boolean)
        ua: () => Browser.userAgent(),         // Full user agent string
        tz: () => (new Date()).getTimezoneOffset(), // Timezone offset (minutes)
        utm_source:   key => Cookie.getUtm(key), // Get utm_source from cookie
        utm_medium:   key => Cookie.getUtm(key), // Get utm_medium
        utm_term:     key => Cookie.getUtm(key), // Get utm_term
        utm_content:  key => Cookie.getUtm(key), // Get utm_content
        utm_campaign: key => Cookie.getUtm(key), // Get utm_campaign
        utm_source_platform:  key => Cookie.getUtm(key),
        utm_creative_format:  key => Cookie.getUtm(key),
        utm_marketing_tactic: key => Cookie.getUtm(key),
    };

    // Combine base attributes and custom parameters
    const allAttributes = { ...baseAttributes, ...Config.params };

    // Build payload object
    for (const key in allAttributes) {
        if (Object.hasOwnProperty.call(allAttributes, key)) {
            try {
                // Execute the function associated with the key to get the current value
                const value = allAttributes[key](key); // Pass key for context if needed (e.g., UTMs)
                // Assign value to dataObject, handling potential absence
                dataObject[key] = Helper.isPresent(value) ? value : null; // Use null for absent values in JSON
            } catch (e) {
                console.error(`Error getting value for parameter "${key}":`, e);
                dataObject[key] = null; // Assign null on error
            }
        }
    }

    // Convert final object to JSON string
    let jsonData;
    try {
        jsonData = JSON.stringify(dataObject);
    } catch (e) {
        console.error(`Failed to stringify tracking data object for event ${event}:`, e, dataObject);
        return; // Don't attempt to send if data is malformed
    }

    console.log(`[core.js] Sending POST payload for event: ${event}`, dataObject); // Log the object before sending

    // Send data using sendBeacon if available, otherwise fallback to fetch POST
    if (navigator.sendBeacon) {
        try {
            // sendBeacon can send Blob data directly
            const blob = new Blob([jsonData], { type: 'application/json' });
            const sent = navigator.sendBeacon(PIXEL_ENDPOINT, blob);
            if (!sent) {
              console.warn(`navigator.sendBeacon returned false for ${event}. Falling back to fetch.`);
              sendFetchPost(jsonData);
            }
        } catch (e) {
             console.error(`Error using navigator.sendBeacon for ${event}:`, e);
             sendFetchPost(jsonData); // Fallback on error
        }
    } else {
        sendFetchPost(jsonData);
    }
}

// Fallback function to send data using fetch POST
async function sendFetchPost(jsonData) {
    console.log(`[core.js] sendFetchPost() called for endpoint: ${PIXEL_ENDPOINT}`);
    try {
        const response = await fetch(PIXEL_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: jsonData,
            keepalive: true, // Attempt to keep connection alive for unload events
            mode: 'cors' // Explicitly set mode for cross-origin requests
        });
        if (!response.ok) {
             console.warn(`Fetch POST request failed for ${PIXEL_ENDPOINT} with status: ${response.status}`);
        }
         console.log(`Sent payload via fetch POST to ${PIXEL_ENDPOINT}`);
    } catch (error) {
        console.error(`Error sending payload via fetch POST to ${PIXEL_ENDPOINT}:`, error);
    }
} 