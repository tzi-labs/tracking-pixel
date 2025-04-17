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
    console.log("[index.js] setupEventListeners() called.");
    // Listener for clicks on elements with data attributes AND generic clicks
    document.body.addEventListener('click', function(e) {
        console.log("[index.js] Body click listener fired.");
        let target = e.target;
        let dataAttrFound = false; // Flag to see if specific tracking handled this click
        let elementForGenericClick = null; // Store the most relevant element for generic click

        // Traverse up the DOM tree to find attributes
        while (target && target !== document.body) {
            // Check for specific data-event attribute FIRST
            if (!dataAttrFound) { // Only check if we haven't already found one lower down
                const eventName = target.getAttribute(`data-${PIXEL_FUNC_NAME}-event`);
                if (eventName) {
                    dataAttrFound = true; // Mark that specific tracking handled it
                    const eventData = target.getAttribute(`data-${PIXEL_FUNC_NAME}-data`);
                    console.log(`[index.js] Data attribute click detected: element=${target.tagName}, event='${eventName}', data='${eventData}'`); 
                    // Trigger custom event
                    window[PIXEL_FUNC_NAME]('event', eventName, eventData);
                    // Don't break here yet, continue checking for anchor tags for pageclose
                }
            }

            // Store the initial target for potential generic click info
            // This ensures we capture info about the *actual* clicked element
            if (elementForGenericClick === null) {
                elementForGenericClick = target;
            }

             // Check for anchor tag - **Track outbound clicks**
            if (target.tagName === 'A' && target.href) {
                 if (Helper.isExternalHost(target)) {
                     console.log(`[index.js] Outbound link clicked: ${target.href}`);
                     // Trigger an event specifically for outbound links
                     window[PIXEL_FUNC_NAME]('event', 'outbound_link_click', { href: target.href });
                     // We no longer need Config.lastExternalHost for pageclose, as we track immediately.
                     // Config.lastExternalHost = { link: target.href, time: Helper.now() };
                 }
                 // We don't break here for links, allow traversal to continue
                 // for potential data-attributes on parent links/elements.
             }

            // If a specific data attribute was found, we can stop the traversal for click tracking purposes
            if (dataAttrFound) {
                 break;
            }

            target = target.parentElement;
        }

        // If NO specific data attribute was found AND trackAllClicks is enabled AND we identified an element
        if (!dataAttrFound && Config.trackAllClicks && elementForGenericClick) {

            let sectionHeadingText = null;
            // Define common block/section level elements
            const sectionSelector = 'div, section, article, aside, main, header, footer, li';
            const headingSelector = 'h1, h2, h3, h4, h5, h6';

            // 1. Try to find a heading within the nearest section container
            const sectionContainer = elementForGenericClick.closest(sectionSelector);
            if (sectionContainer) {
                const headingInSection = sectionContainer.querySelector(headingSelector);
                if (headingInSection) {
                    sectionHeadingText = headingInSection.textContent?.trim().substring(0, 150);
                }
            }

            // 2. If no heading found in a container, fall back to nearest ancestor heading
            if (!sectionHeadingText) {
                const closestAncestorHeading = elementForGenericClick.closest(headingSelector);
                if (closestAncestorHeading) {
                     sectionHeadingText = closestAncestorHeading.textContent?.trim().substring(0, 150);
                }
            }

             // Gather data from the initially clicked element
            const clickData = {
                tagName: elementForGenericClick.tagName,
                id: elementForGenericClick.id || null,
                classes: elementForGenericClick.className || null,
                text: elementForGenericClick.textContent?.trim().substring(0, 100) || null, // Text of the clicked element
                sectionHeading: sectionHeadingText // Heading text from container/ancestor
            };
            console.log('[index.js] Generic click detected:', clickData);
            window[PIXEL_FUNC_NAME]('event', 'generic_click', clickData);
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