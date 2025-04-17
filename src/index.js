// src/index.js - Restored with logging
import { Config, processCommand, initQueue } from './core.js';
import { Cookie, Helper } from './utils.js';

// Constants injected by Vite's define plugin
const PIXEL_FUNC_NAME = __PIXEL_FUNC_NAME__;
console.log(`[index.js] TOP LEVEL: Script loaded. PIXEL_FUNC_NAME = ${PIXEL_FUNC_NAME}`);

// --- Initialization ---
console.log(`[index.js] Checking window[${PIXEL_FUNC_NAME}]...`, window[PIXEL_FUNC_NAME]);

// Establish the global function and queue if they don't exist (from snippet)
if (typeof window[PIXEL_FUNC_NAME] !== 'undefined' && typeof window[PIXEL_FUNC_NAME].queue !== 'undefined') {
  console.log(`[index.js] Snippet function found. Processing queue.`);
  const existingQueue = window[PIXEL_FUNC_NAME].queue;
  const initialTimestamp = window[PIXEL_FUNC_NAME].t || Helper.now();

  // Replace the placeholder function with the real one
  window[PIXEL_FUNC_NAME] = function() {
    console.log(`[index.js] Global function ${PIXEL_FUNC_NAME} called with args:`, arguments);
    // Pass arguments using apply to spread them correctly
    processCommand.apply(null, arguments);
  };

  // Assign properties to the function object
  window[PIXEL_FUNC_NAME].t = initialTimestamp; // Keep original timestamp if set
  // Ensure the .process method also uses apply if it's ever called directly elsewhere
  // Though typically it's called via the main function which now uses apply.
  window[PIXEL_FUNC_NAME].process = function() { 
      console.log(`[index.js] .process method called directly with:`, arguments); 
      processCommand.apply(null, arguments);
  }

  // Initialize essential cookies and UTM parameters
  console.log('[index.js] Calling initQueue()...');
  initQueue();

  // Process any commands that were queued before the script loaded
  console.log(`[index.js] Processing ${existingQueue.length} queued commands...`);
  existingQueue.forEach((args, index) => {
    console.log(`[index.js] Processing queued command ${index}:`, args);
    // This existing call using apply was already correct for queued items
    window[PIXEL_FUNC_NAME].process.apply(null, args); 
  });

} else {
  // This case should ideally not happen if the snippet is used correctly,
  // but provides a fallback if the script is loaded directly.
  console.warn(`[index.js] ${PIXEL_FUNC_NAME} global function or queue not initialized by snippet. Setting up directly.`);
  window[PIXEL_FUNC_NAME] = function() {
    console.log(`[index.js] Fallback global function ${PIXEL_FUNC_NAME} called with args:`, arguments);
    // Use apply here too for consistency
    processCommand.apply(null, arguments);
  };
  window[PIXEL_FUNC_NAME].t = Helper.now();
  // Update .process in fallback as well
  window[PIXEL_FUNC_NAME].process = function() { 
      console.log(`[index.js] Fallback .process method called directly with:`, arguments);
      processCommand.apply(null, arguments);
  } 
  console.log('[index.js] Calling initQueue() in fallback...');
  initQueue(); // Initialize cookies etc.
}

// --- Automatic Event Listeners ---
console.log('[index.js] Setting up event listeners...');

// Page close event listener
// Use 'pagehide' for modern browsers (more reliable), fallback to 'unload'
// Avoid issues with Safari's unreliable pagehide/visibilitychange
const isSafari = typeof safari === 'object' && safari.pushNotification;
const isPageHideSupported = 'onpageshow' in self;
const pageCloseEvent = isPageHideSupported && !isSafari ? 'pagehide' : 'unload';

window.addEventListener(pageCloseEvent, function() {
    console.log(`[index.js] ${pageCloseEvent} event triggered.`); // Added log
  if (!Config.pageCloseOnce) {
    Config.pageCloseOnce = true;
    // Trigger 'pageclose' event using the established processing function
    console.log(`[index.js] Sending 'pageclose' event via ${PIXEL_FUNC_NAME}...`); // Added log
    window[PIXEL_FUNC_NAME]('event', 'pageclose');
    // Optional: Send last clicked external link (logic moved to core.js)
  } else {
      console.log(`[index.js] 'pageclose' event already processed.`); // Added log
  }
});


// DOM Content Loaded / Window Load Listeners
function setupEventListeners() {
    console.log("[index.js] setupEventListeners() called."); // Added log
    // Listener for clicks on elements with data attributes
    document.body.addEventListener('click', function(e) {
        console.log("[index.js] Body click listener fired."); // Added log
        let target = e.target;
        let dataAttrFound = false;
        let linkFound = false;

        // Traverse up the DOM tree to find attributes
        while (target && target !== document.body) {
            // Check for data-event attribute
            if (!dataAttrFound) {
                const eventName = target.getAttribute(`data-${PIXEL_FUNC_NAME}-event`);
                if (eventName) {
                    dataAttrFound = true; // Stop searching for this type once found
                    const eventData = target.getAttribute(`data-${PIXEL_FUNC_NAME}-data`);
                    console.log(`[index.js] Data attribute click detected: event='${eventName}', data='${eventData}'`); // Added log
                    // Trigger custom event
                    window[PIXEL_FUNC_NAME]('event', eventName, eventData);
                }
            }

            // Check for anchor tag
             if (!linkFound && target.tagName === 'A' && target.href) {
                 linkFound = true; // Stop searching for this type once found
                 if (Helper.isExternalHost(target)) {
                     console.log(`[index.js] External link clicked: ${target.href}`); // Added log
                     // Store the external link info for potential use in 'pageclose'
                    Config.lastExternalHost = { link: target.href, time: Helper.now() };
                 }
             }

            // If both types found, no need to traverse further
            if (dataAttrFound && linkFound) {
                break;
            }

            target = target.parentElement;
        }

    }, true); // Use capture phase

    console.log("[index.js] Click event listeners attached to body.");
}

// Wait for the DOM to be fully loaded to attach listeners
console.log(`[index.js] Document readyState: ${document.readyState}. Attaching DOM listeners...`);
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupEventListeners);
} else {
  // DOMContentLoaded has already fired
  setupEventListeners();
}

console.log(`[index.js] ${PIXEL_FUNC_NAME} tracker core setup potentially complete.`); 