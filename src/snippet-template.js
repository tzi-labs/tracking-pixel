// src/snippet-template.js
// NOTE: This file is NOT processed by Vite directly for dependencies.
// Placeholders are replaced by the generateSnippetPlugin in vite.config.js.

(function(window, document, script, endpoint, funcName, cacheMs, funcObj, scriptTag, firstScript) {
  // Avoid re-initialization if snippet is included multiple times
  if (window[funcName]) {
    console.warn('Tracker snippet included multiple times. Skipping initialization.');
    return;
  }

  // Create the global function queue
  funcObj = window[funcName] = function() {
    // If the main script is loaded, call its processor. Otherwise, queue the call.
    (funcObj.process ? funcObj.process.apply(funcObj, arguments) : funcObj.queue.push(arguments));
  };

  // Initialize the queue array and store the initial timestamp
  funcObj.queue = [];
  funcObj.t = Date.now(); // Use Date.now() for modern browsers

  // Create the script element for asynchronous loading
  scriptTag = document.createElement(script);
  scriptTag.async = 1; // Ensure asynchronous loading
  scriptTag.src = endpoint + '?t=' + (Math.ceil(Date.now() / cacheMs) * cacheMs); // Cache busting based on time

  // Find the first script tag on the page
  firstScript = document.getElementsByTagName(script)[0];

  // Insert the new script tag before the first one found
  if (firstScript && firstScript.parentNode) {
    firstScript.parentNode.insertBefore(scriptTag, firstScript);
  } else {
    // Fallback if no script tag is found (e.g., in <head> with no other scripts)
    (document.head || document.getElementsByTagName('head')[0] || document.documentElement).appendChild(scriptTag);
  }

  // --- Initial commands ---
  // These are queued immediately using the function created above.

  // Initialize with the tracker ID (replaced by plugin)
  window[funcName]('init', 'ID_PLACEHOLDER');
  // Send the initial 'pageload' event
  window[funcName]('event', 'pageload');

})(window, document, 'script', 'JS_ENDPOINT_PLACEHOLDER', 'OPIX_FUNC_PLACEHOLDER', 24 * 60 * 60 * 1000); // 24-hour cache busting 