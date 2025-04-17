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
export function processCommand(args) {
    // Convert arguments object to array
    const [method, value, optional] = Array.from(args);

    if (method === 'init') {
        if (value) {
            Config.id = value;
            console.log(`Tracker initialized with ID: ${Config.id}`);
        } else {
            console.error("Initialization command 'init' requires a tracker ID.");
        }
    } else if (method === 'param') {
        if (value && typeof optional !== 'undefined') {
            // Store custom parameters. The value will be evaluated when the pixel is sent.
            Config.params[value] = () => Helper.optionalData(optional); // Store function to resolve data later
            console.log(`Custom parameter set: ${value}`);
        } else {
            console.error("Command 'param' requires a key and a value.");
        }
    } else if (method === 'event') {
        handleEvent(value, optional);
    } else {
        console.warn(`Unknown command: ${method}`);
    }
}

// --- Event Handling ---
function handleEvent(eventName, eventData) {
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
            sendPixel(eventName, timestamp, eventData);
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
            closeData = typeof closeData === 'object' ? { ...closeData, ...externalLinkData } : externalLinkData;
        }
        sendPixel(eventName, timestamp, closeData); // Send potentially augmented data
    } else {
        // Handle custom events directly
        sendPixel(eventName, timestamp, eventData);
    }
}


// --- Pixel Sending ---
function sendPixel(event, timestamp, optionalData) {
    if (!Config.id) {
        console.warn("Tracker not initialized with an ID. Pixel not sent.");
        return;
    }

    const params = [];
    const optional = Helper.optionalData(optionalData); // Process optional data early

    // Define base attributes function map
    const baseAttributes = {
        id: () => Config.id,                   // Website/Tracker ID
        uid: () => Cookie.get('uid'),           // User ID from cookie
        ev: () => event,                       // Event name
        ed: () => optional,                    // Event data (processed)
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
        // Add newer UTM params if needed, ensure they are in Cookie.setUtms
        utm_source_platform:  key => Cookie.getUtm(key),
        utm_creative_format:  key => Cookie.getUtm(key),
        utm_marketing_tactic: key => Cookie.getUtm(key),
    };

    // Combine base attributes and custom parameters
    const allAttributes = { ...baseAttributes, ...Config.params };

    // Build query string parameters
    for (const key in allAttributes) {
        if (Object.hasOwnProperty.call(allAttributes, key)) {
            try {
                // Execute the function associated with the key to get the current value
                const value = allAttributes[key](key); // Pass key for context if needed (e.g., UTMs)
                // Encode and add the parameter if the value is present
                if (Helper.isPresent(value)) {
                    params.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
                } else {
                    // Send empty value if key exists but value is null/undefined/empty
                    params.push(`${encodeURIComponent(key)}=`);
                }
            } catch (e) {
                console.error(`Error getting value for parameter "${key}":`, e);
                params.push(`${encodeURIComponent(key)}=`); // Add empty on error
            }
        }
    }

    const queryString = params.join('&');
    const sourceUrl = `${PIXEL_ENDPOINT}?${queryString}`;

    console.log(`Sending pixel for event: ${event}`, sourceUrl); // Log for debugging

    // Send data using sendBeacon if available, otherwise fallback to image
    if (navigator.sendBeacon) {
        try {
            const sent = navigator.sendBeacon(sourceUrl);
            if (!sent) {
              console.warn(`navigator.sendBeacon returned false for ${event}. Falling back to image.`);
              sendImagePixel(sourceUrl);
            }
        } catch (e) {
             console.error(`Error using navigator.sendBeacon for ${event}:`, e);
             sendImagePixel(sourceUrl); // Fallback on error
        }
    } else {
        sendImagePixel(sourceUrl);
    }
}

// Fallback function to send pixel using an image tag
function sendImagePixel(url) {
    const img = document.createElement('img');
    img.src = url;
    img.style.display = 'none';
    img.width = 1;
    img.height = 1;
    img.alt = ''; // Accessibility best practice
    img.setAttribute('aria-hidden', 'true'); // Hide from screen readers
    document.body.appendChild(img);
     // Optional: Remove image after a delay to avoid cluttering the DOM
    setTimeout(() => {
        if (img.parentNode) {
            img.parentNode.removeChild(img);
        }
    }, 1000); // Remove after 1 second
    console.log(`Sent pixel via image for URL: ${url}`);
} 