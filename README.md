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
*   Uses `navigator.sendBeacon` when available for reliable data transmission, with image pixel fallback.

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

The tracker's behavior is configured during the build process. You can set options via environment variables or by directly modifying the `getConfig` function in `vite.config.js`.

**Key Configuration Options:**

| Variable                 | Environment Variable        | Default Value         | Description                                                                 |
| :----------------------- | :------------------------ | :-------------------- | :-------------------------------------------------------------------------- |
| `PIXEL_FUNC_NAME`        | `OPIX_PIXEL_FUNC_NAME`    | `'strk'`              | The name of the global JavaScript function used to send events (e.g., `strk(...)`). |
| `PIXEL_ENDPOINT`         | `OPIX_PIXEL_ENDPOINT`     | `'/pixel.gif'`        | The URL endpoint where the tracking data will be sent.                        |
| `JS_ENDPOINT`            | `OPIX_JS_ENDPOINT`        | `'/tracker.min.js'`   | The URL path where the built `tracker.min.js` file will be hosted.          |
| `VERSION`                | `OPIX_VERSION`            | `'1'`                 | The version number embedded in the tracker and GUIDs.                       |
| `DIST_FOLDER`            | `OPIX_DESTINATION_FOLDER` | `'dist'`              | The output directory for the build files (`tracker.min.js`, `snippet.html`). |
| `TRACKER_ID`             | `OPIX_TRACKER_ID`         | `'YOUR-TRACKING-ID'` | **REQUIRED.** The unique identifier for the website/app being tracked.       |
| `SNIPPET_TEMPLATE_PATH`  | N/A                       | `'src/snippet-template.js'` | Path to the snippet template file (usually no need to change).           |

**Important:** You **must** configure `TRACKER_ID` either by setting the `OPIX_TRACKER_ID` environment variable or by changing the default value in `vite.config.js` before building for production use.

**Example using environment variables:**

```bash
OPIX_TRACKER_ID="MY-SITE-123" OPIX_PIXEL_ENDPOINT="https://my-tracker.com/track" OPIX_JS_ENDPOINT="/assets/strk.js" pnpm build
```

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
    *   `snippet-template.js`: Template for the embeddable HTML snippet.
*   `dist/`: Contains the built distributable files (created by `pnpm build` or `pnpm watch`).
    *   `tracker.min.js`: The core tracker script.
    *   `snippet.html`: The embeddable HTML snippet.
*   `vite.config.js`: Vite build configuration, including the snippet generation plugin.
*   `package.json`: Project definition and dependencies.

## Usage

### 1. Backend Setup

You need a backend server endpoint capable of receiving HTTP GET requests at the URL specified by `PIXEL_ENDPOINT`. This endpoint should:

*   Accept GET requests.
*   Parse the query string parameters (see "Data Sent" below).
*   Process or store the received tracking data (e.g., log to a file, insert into a database).
*   Ideally, respond with a `204 No Content` status or a small, valid image (like a 1x1 transparent GIF) with appropriate cache headers (`Cache-Control: no-cache, no-store, must-revalidate`, `Pragma: no-cache`, `Expires: 0`).

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

## Data Sent

Each request sent to the `PIXEL_ENDPOINT` includes the following query string parameters. All keys are included, even if the value is empty.

| Key                 | Example Value               | Details                                                     | Source                                         |
| :------------------ | :-------------------------- | :---------------------------------------------------------- | :--------------------------------------------- |
| `id`                | `MY-SITE-123`               | Tracker ID for the website/app                              | `Config.id` (from `init` command)              |
| `uid`               | `1-abcd...`                 | Unique User ID (stored in `__<funcName>_uid` cookie)        | `Cookie.get('uid')`                            |
| `ev`                | `pageload`                  | The event name (`pageload`, `pageclose`, or custom)         | Event trigger                                  |
| `ed`                | `{"step":1}` or `"xyz"`     | Optional event data (JSON string, string, or empty)         | 3rd argument to `event` command / data attribute |
| `v`                 | `1`                         | Tracker version                                             | `Config.version` (build time)                |
| `dl`                | `http://example.com/page`   | Document Location (current page URL)                        | `window.location.href`                         |
| `rl`                | `http://google.com/`        | Referrer Location                                           | `document.referrer`                          |
| `ts`                | `1678886400000`             | Timestamp (milliseconds since epoch) when event occurred    | `Date.now()` or initial `func.t`             |
| `de`                | `UTF-8`                     | Document character set                                      | `document.characterSet`                        |
| `sr`                | `1920x1080`                 | Screen Resolution                                           | `window.screen.width/height`                   |
| `vp`                | `1400x900`                  | Viewport Size                                               | `window.innerWidth/Height`                     |
| `cd`                | `24`                        | Color Depth                                                 | `window.screen.colorDepth`                     |
| `dt`                | `Example Page Title`        | Document Title                                              | `document.title`                             |
| `bn`                | `Chrome 110`                | Browser Name and Version                                    | `Browser.nameAndVersion()`                     |
| `md`                | `false`                     | Mobile Device (boolean)                                     | `Browser.isMobile()`                           |
| `ua`                | `Mozilla/5.0 ...`           | Full User Agent string                                      | `navigator.userAgent`                        |
| `tz`                | `240`                       | Timezone offset from UTC (minutes)                          | `(new Date()).getTimezoneOffset()`             |
| `utm_source`        | `google`                    | Campaign Source                                             | `__<funcName>_utm` cookie (session)            |
| `utm_medium`        | `cpc`                       | Campaign Medium                                             | `__<funcName>_utm` cookie                      |
| `utm_term`          | `tracking+pixel`            | Campaign Term                                               | `__<funcName>_utm` cookie                      |
| `utm_content`       | `ad_variant_1`              | Campaign Content                                            | `__<funcName>_utm` cookie                      |
| `utm_campaign`      | `spring_sale`               | Campaign Name                                               | `__<funcName>_utm` cookie                      |
| `utm_source_platform`| `google_ads`             | Source platform                                             | `__<funcName>_utm` cookie                      |
| `utm_creative_format`| `responsive_display_ad`    | Creative format                                             | `__<funcName>_utm` cookie                      |
| `utm_marketing_tactic`| `retargeting`            | Marketing tactic                                            | `__<funcName>_utm` cookie                      |
| *(custom params)*   | *(varies)*                  | Any custom parameters added via `strk('param', key, value)` | `Config.params`                                |

## License

MIT License (refer to `LICENSE` file if one exists, or check `package.json`). 