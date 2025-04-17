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

Use the global function (default: `strk`) defined by `PIXEL_FUNC_NAME` to send custom events.

*   **Syntax:** `strk('event', 'yourEventName', optionalData)`

*   **`yourEventName` (String):** The name of the event (e.g., `'button_click'`, `'form_submit'`). Avoid using `'pageload'` or `'pageclose'` as these are handled automatically.
*   **`optionalData` (String | Object | Function):** Optional data to send with the event.
    *   If an **Object**, it will be `JSON.stringify`-ed.
    *   If a **Function**, it will be executed, and its return value will be processed (useful for getting dynamic data at the time of the event).
    *   Any other type will be converted to a string.

*   **Examples:**
    ```javascript
    // Simple event
    strk('event', 'video_play');

    // Event with simple data
    strk('event', 'add_to_cart', 'product_sku_123');

    // Event with JSON data
    strk('event', 'checkout_step_1', { step: 1, value: 99.99 });

    // Event with data from a function
    strk('event', 'search_performed', function() {
      return document.getElementById('search-input').value;
    });
    ```

### 5. Using Data Attributes

Add `data-[funcName]-event` attributes to HTML elements to automatically trigger an event on click. The default function name (`strk`) would use `data-strk-event`.

You can optionally include `data-[funcName]-data` to pass string data with the click event.

*   **Example:**
    ```html
    <!-- Simple click event -->
    <button data-strk-event="special-button-click">Click Me</button>

    <!-- Click event with data -->
    <a href="#" data-strk-event="promo_banner_click" data-strk-data="Summer Sale 2024">
      Learn More!
    </a>
    ```

## Testing Locally

1.  Ensure you have configured your details in `.env` and run `pnpm build` successfully.
2.  ~~Make sure the generated snippet from `dist/snippet.html` has been manually copied into `index.html` (replacing the placeholder comments).~~ (This step is no longer needed - the snippet is injected automatically during build).
3.  You need a simple HTTP server to view the **generated `dist/index.html`** file and serve the `dist` files correctly.
    *   **Using Vite:** Run `pnpm preview`. This command serves the `dist` directory and is often the easiest way. Access `http://localhost:4173` (or the URL provided).
    *   **Using Python:** If you have Python installed, navigate to the project root in your terminal and run `cd dist && python -m http.server` (for Python 3) or `cd dist && python -m SimpleHTTPServer` (for Python 2). Access the page at `http://localhost:8000`.
    *   **Using Node.js:** Install a simple server package globally (`npm install -g serve` or `pnpm add -g serve`) and run `serve dist` in the project root. Access the page at the URL provided (usually `http://localhost:3000`).
4.  Open the provided URL (pointing to the *served `dist` directory*) in your browser.
5.  Open your browser's Developer Tools (usually F12).
    *   Check the **Console** for any errors from the tracker script.
    *   Check the **Network** tab for `POST` requests being sent to your configured `OPIX_PIXEL_ENDPOINT` when the page loads or when you click the test buttons.
    *   Verify that your backend server is receiving these requests and logging the data correctly.

## Data Sent

Each request sent to the `OPIX_PIXEL_ENDPOINT` is a **POST** request with a **JSON body** containing the following key-value pairs. Keys corresponding to absent data (e.g., no referrer, optional event data not provided) will have a value of `null`.

| Key                 | Example Value               | Details                                                     | Source                                         |
| :------------------ | :-------------------------- | :---------------------------------------------------------- | :--------------------------------------------- |
| `id`                | `MY-SITE-123`               | Tracker ID for the website/app                              | `Config.id` (from `init` command)              |
| `uid`               | `1-abcd...`                 | Unique User ID (stored in `__<funcName>_uid` cookie)        | `Cookie.get('uid')`                            |
| `ev`                | `pageload`                  | The event name (`pageload`, `pageclose`, or custom)         | Event trigger                                  |
| `ed`                | `{"step":1}` or `"xyz"` or `null` | Optional event data (parsed object, string, or null)       | 3rd argument to `event` command / data attribute |
| `v`                 | `1`                         | Tracker version                                             | `Config.version` (build time)                |
| `dl`                | `http://example.com/page`   | Document Location (current page URL)                        | `window.location.href`                         |
| `rl`                | `http://google.com/` or `null` | Referrer Location                                           | `document.referrer`                          |
| `ts`                | `1678886400000`             | Timestamp (milliseconds since epoch) when event occurred    | `Date.now()` or initial `func.t`             |
| `de`                | `UTF-8` or `null`           | Document character set                                      | `document.characterSet`                        |
| `sr`                | `1920x1080`                 | Screen Resolution                                           | `window.screen.width/height`                   |
| `vp`                | `1400x900`                  | Viewport Size                                               | `window.innerWidth/Height`                     |
| `cd`                | `24`                        | Color Depth                                                 | `window.screen.colorDepth`                     |
| `dt`                | `Example Page Title`        | Document Title                                              | `document.title`                             |
| `bn`                | `Chrome 110`                | Browser Name and Version                                    | `Browser.nameAndVersion()`                     |
| `md`                | `false`                     | Mobile Device (boolean)                                     | `Browser.isMobile()`                           |
| `ua`                | `Mozilla/5.0 ...`           | Full User Agent string                                      | `navigator.userAgent`                        |
| `tz`                | `240`                       | Timezone offset from UTC (minutes)                          | `(new Date()).getTimezoneOffset()`             |
| `utm_source`        | `google` or `null`          | Campaign Source                                             | `__<funcName>_utm` cookie (session)            |
| `utm_medium`        | `cpc` or `null`             | Campaign Medium                                             | `__<funcName>_utm` cookie                      |
| `utm_term`          | `tracking+pixel` or `null`  | Campaign Term                                               | `__<funcName>_utm` cookie                      |
| `utm_content`       | `ad_variant_1` or `null`    | Campaign Content                                            | `__<funcName>_utm` cookie                      |
| `utm_campaign`      | `spring_sale` or `null`     | Campaign Name                                               | `__<funcName>_utm` cookie                      |
| `utm_source_platform`| `google_ads` or `null`    | Source platform                                             | `__<funcName>_utm` cookie                      |
| `utm_creative_format`| `responsive_display_ad` or `null` | Creative format                                        | `__<funcName>_utm` cookie                      |
| `utm_marketing_tactic`| `retargeting` or `null`   | Marketing tactic                                            | `__<funcName>_utm` cookie                      |
| *(custom params)*   | *(varies)*                  | Any custom parameters added via `strk('param', key, value)` | `Config.params` (value can be `null`)          |

## License

MIT License (refer to `LICENSE`