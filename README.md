# Simple Tracker

A lightweight, configurable tracking pixel system built with Vite, inspired by Openpixel.

This project provides a client-side JavaScript library (`tracker.min.js`) and an embeddable HTML snippet (`snippet.html`) to track user interactions on websites and send the data to a configurable endpoint.

## Features

*   Tracks basic user/session info (UID via cookie).
*   Captures standard web analytics data (URL, referrer, screen resolution, viewport, etc.).
*   Automatically tracks `pageload` and `pageclose` events.
*   Captures UTM parameters from the URL and stores them in a session cookie.
*   Allows tracking custom events via JavaScript calls or HTML data attributes.
*   Configurable build process using environment variables or `vite.config.js`.
*   Uses `navigator.sendBeacon` (POST request with JSON body) when available for reliable data transmission.
*   Falls back to `fetch` (POST request with JSON body) if `sendBeacon` is unavailable.

## Setup

### Prerequisites

*   [Node.js](https://nodejs.org/) (LTS version recommended)
*   [pnpm](https://pnpm.io/) (or npm/yarn, though commands below use pnpm)

### Installation

1.  Clone the repository:
    ```bash
    git clone <your-repo-url>
    cd simple-tracker
    ```
2.  Install dependencies:
    ```bash
    pnpm install
    ```

## Configuration

The tracker's behavior is configured during the build process using environment variables. The easiest way to manage these is by creating a `.env` file in the project root.

1.  Copy the example file:
    ```bash
    cp .env.example .env
    ```
2.  Edit the `.env` file with your specific configuration values.

**Key Configuration Options (set in `.env`):**

| Variable                 | Default Value (`vite.config.js`) | Description                                                                 |
| :----------------------- | :------------------------------- | :-------------------------------------------------------------------------- |
| `OPIX_TRACKER_ID`        | `'YOUR-TRACKING-ID'`             | **REQUIRED.** The unique identifier for the website/app being tracked.       |
| `OPIX_PIXEL_ENDPOINT`    | `'/pixel.gif'`                   | **REQUIRED.** The full URL endpoint where the tracking data will be sent.     |
| `OPIX_JS_ENDPOINT`       | `'/tracker.min.js'`              | The URL path where the built `tracker.min.js` file will be hosted.          |
| `OPIX_PIXEL_FUNC_NAME`   | `'strk'`                         | Optional: The name of the global JavaScript function (e.g., `strk(...)`).     |
| `OPIX_VERSION`           | `'1'`                            | Optional: The version number embedded in the tracker and GUIDs.             |
| `OPIX_DESTINATION_FOLDER`| `'dist'`                         | Optional: The output directory for the build files (`tracker.min.js`, `snippet.html`). |

**Important:**
*   You **must** set `OPIX_TRACKER_ID` and `OPIX_PIXEL_ENDPOINT` in your `.env` file before building for production use.
*   Values set in `.env` will override the default values specified in `vite.config.js`.
*   Environment variables passed directly via the command line (e.g., `OPIX_TRACKER_ID=ABC pnpm build`) will take precedence over `.env` file values.

*(The `SNIPPET_TEMPLATE_PATH` is configured directly in `vite.config.js` and usually doesn't need changing).*

## Development

1.  **Install Dependencies:**
    ```bash
    pnpm install
    ```
2.  **Build for Production:** Compiles and minifies the tracker and snippet into the `dist` folder.
    ```bash
    pnpm build
    ```
3.  **Watch Mode:** Automatically rebuilds the files in the `dist` folder whenever you make changes in the `src` directory. Useful during development.
    ```bash
    pnpm watch
    ```

### File Structure

*   `src/`: Contains the source JavaScript files.
    *   `index.js`: Main entry point, sets up global function and event listeners.
    *   `core.js`: Handles configuration, command processing, and pixel sending logic.
    *   `utils.js`: Utility classes (Helper, Cookie, Browser, Url).
    *   `snippet-template.js`: Template *used internally by the build* to generate the embeddable snippet.
*   `index.html`: Root HTML file template *used internally by the build* to generate the demo page.
*   `dist/`: Contains the built distributable files (created by `pnpm build` or `pnpm watch`).
    *   `tracker.min.js`: The core tracker script.
    *   `index.html`: A demo HTML page with the tracker snippet (configured by `.env`) automatically injected.
    *   ~~`snippet.html`: The embeddable HTML snippet.~~ (No longer generated separately)
*   `vite.config.js`: Vite build configuration, including the snippet/index.html generation plugin.
*   `package.json`: Project definition and dependencies.

## Usage

### 1. Backend Setup

You need a backend server endpoint capable of receiving **HTTP POST** requests at the URL specified by `OPIX_PIXEL_ENDPOINT`. This endpoint **must**:

*   Accept `POST` requests.
*   Expect a request body with `Content-Type: application/json`.
*   Read the tracking data from the **request body** and parse it as JSON (see "Data Sent" below for the structure).
*   Configure **Cross-Origin Resource Sharing (CORS)** correctly. Since the tracker sends `POST` requests with `Content-Type: application/json` from different origins (your users' browsers), your server needs to handle CORS preflight (`OPTIONS`) requests and respond with appropriate headers, including:
    *   `Access-Control-Allow-Origin: *` (or restrict to specific domains)
    *   `Access-Control-Allow-Methods: POST, OPTIONS`
    *   `Access-Control-Allow-Headers: Content-Type`
*   Respond with a `204 No Content` status code upon successful receipt and processing of the data.

### 2. Host `tracker.min.js`

Upload the generated `dist/tracker.min.js` file to a publicly accessible location (like a CDN or your web server). Ensure the `JS_ENDPOINT` configuration used during the build matches this location.

### 3. Embed the Snippet

Copy the contents of the generated `dist/snippet.html` file and paste it into the HTML of the website(s) you want to track, preferably within the `<head>` section or near the top of the `<body>`.

The snippet looks like this (after build):

```html
<!-- Start Simple Tracker Snippet -->
<script>
/* Minified snippet code */
!function(w,d,s,e,f,c,j,t,i){if(w[f])return void console.warn("Tracker snippet included multiple times. Skipping initialization.");(j=w[f]=function(){(j.process?j.process.apply(j,arguments):j.queue.push(arguments))}).queue=[],j.t=Date.now(),(t=d.createElement(s)).async=1,t.src=e+"?t="+(Math.ceil(Date.now()/c)*c),(i=d.getElementsByTagName(s)[0])&&i.parentNode?i.parentNode.insertBefore(t,i):(d.head||d.getElementsByTagName("head")[0]||d.documentElement).appendChild(t),w[f]("init","YOUR-TRACKING-ID"),w[f]("event","pageload")}(window,document,"script","/tracker.min.js","strk",864e5);
</script>
<!-- End Simple Tracker Snippet -->
```

*(Note: The actual minified code and configured values like endpoint, function name, and ID will vary based on your build configuration).*

### 4. Sending Custom Events

Use the global function (default: `strk`) defined by `PIXEL_FUNC_NAME` to interact with the tracker.

*   **Initialize:** `strk('init', 'YOUR-TRACKER-ID')` - This is usually handled by the snippet.

*   **Send Event:** `strk('event', 'yourEventName', optionalData)`
    *   `yourEventName` (String): The name of the event (e.g., `'button_click'`, `'form_submit'`). Avoid using `'pageload'` or `'pageclose'` as these are handled automatically. `'generic_click'` is used by the `trackAllClicks` feature.
    *   `optionalData` (String | Object | Function): Optional data to send with the event. Objects are stringified, functions are executed.

*   **Set Custom Parameter:** `strk('param', 'parameterName', valueOrFunction)` - Adds a custom key-value pair to *all* subsequent tracking requests.

*   **Set Configuration:** `strk('config', 'configKey', value)` - Changes tracker behavior.
    *   `strk('config', 'trackAllClicks', true)`: Enables automatic tracking of all clicks on the page. The event name sent will be `'generic_click'`, and the event data (`ed`) will contain details about the clicked element (`tagName`, `id`, `classes`, `text`, `sectionHeading`). Defaults to `false`.

*   **Examples:**
    ```