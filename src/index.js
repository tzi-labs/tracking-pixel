import { Config, processCommand, initQueue } from './core.js';
import { Cookie, Helper } from './utils.js';

// Constants injected by Vite's define plugin
const PIXEL_FUNC_NAME = __PIXEL_FUNC_NAME__;

// --- Initialization ---

// Establish the global function and queue if they don't exist (from snippet)
if (typeof window[PIXEL_FUNC_NAME] !== 'undefined') {
  const existingQueue = window[PIXEL_FUNC_NAME].queue || [];
  const initialTimestamp = window[PIXEL_FUNC_NAME].t || Helper.now();

  // Replace the placeholder function with the real one
  window[PIXEL_FUNC_NAME] = function() {
    processCommand(arguments);
  };

  // Assign properties to the function object
  window[PIXEL_FUNC_NAME].t = initialTimestamp; // Keep original timestamp if set
  window[PIXEL_FUNC_NAME].process = processCommand; // Expose process method

  // Initialize essential cookies and UTM parameters
  initQueue();

  // Process any commands that were queued before the script loaded
  console.log(`Processing ${existingQueue.length} queued commands.`);
  existingQueue.forEach(args => {
    window[PIXEL_FUNC_NAME].process.apply(null, args); // Use apply to pass arguments correctly
  });

} else {
  // This case should ideally not happen if the snippet is used correctly,
  // but provides a fallback if the script is loaded directly.
  console.warn(`${PIXEL_FUNC_NAME} global function not initialized by snippet. Setting up directly.`);
  window[PIXEL_FUNC_NAME] = function() {
    processCommand(arguments);
  };
  window[PIXEL_FUNC_NAME].t = Helper.now();
  window[PIXEL_FUNC_NAME].process = processCommand;
  initQueue(); // Initialize cookies etc.
}

// --- Automatic Event Listeners ---

// Page close event listener
// Use 'pagehide' for modern browsers (more reliable), fallback to 'unload'
// Avoid issues with Safari's unreliable pagehide/visibilitychange
const isSafari = typeof safari === 'object' && safari.pushNotification;
const isPageHideSupported = 'onpageshow' in self;
const pageCloseEvent = isPageHideSupported && !isSafari ? 'pagehide' : 'unload';

window.addEventListener(pageCloseEvent, function() {
  if (!Config.pageCloseOnce) {
    Config.pageCloseOnce = true;
    // Trigger 'pageclose' event using the established processing function
    window[PIXEL_FUNC_NAME]('event', 'pageclose');
    // Optional: Send last clicked external link (logic moved to core.js)
  }
});


// DOM Content Loaded / Window Load Listeners
function setupEventListeners() {
    // Listener for clicks on elements with data attributes
    document.body.addEventListener('click', function(e) {
        let target = e.target;
        // Traverse up the DOM tree to find the attribute if the click was on a child element
        while (target && target !== document.body) {
            const eventName = target.getAttribute(`data-${PIXEL_FUNC_NAME}-event`);
            if (eventName) {
                const eventData = target.getAttribute(`data-${PIXEL_FUNC_NAME}-data`);
                // Trigger custom event
                window[PIXEL_FUNC_NAME]('event', eventName, eventData);
                break; // Stop traversing once an element with the attribute is found
            }
            target = target.parentElement;
        }

        // Listener for clicks on anchor tags to track external links for pageclose
        target = e.target;
        while (target && target !== document.body) {
            if (target.tagName === 'A' && target.href) {
                 if (Helper.isExternalHost(target)) {
                     // Store the external link info for potential use in 'pageclose'
                    Config.lastExternalHost = { link: target.href, time: Helper.now() };
                 }
                break; // Stop traversing once an anchor tag is found
            }
             target = target.parentElement;
        }

    }, true); // Use capture phase to ensure listener works even if event propagation is stopped

    console.log("Click event listeners attached.");
}

// Wait for the DOM to be fully loaded to attach listeners
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupEventListeners);
} else {
  // DOMContentLoaded has already fired
  setupEventListeners();
}

console.log(`${PIXEL_FUNC_NAME} tracker core loaded and initialized.`); 