// src/utils.js

// Constants injected by Vite
const PIXEL_FUNC_NAME = __PIXEL_FUNC_NAME__;
const VERSION = __VERSION__;

// --- Helper Class ---
export class Helper {
  static isPresent(variable) {
    return typeof variable !== 'undefined' && variable !== null && variable !== '';
  }

  static now() {
    // Returns timestamp in milliseconds
    return Date.now();
  }

  static guid() {
    // Generates a unique(ish) ID, prefixed with the tracker version
    return `${VERSION}-${'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    })}`;
  }

  // Safely converts optional data (object, function, or other) to a string for query params
  static optionalData(data) {
    if (!Helper.isPresent(data)) {
      return '';
    }
    try {
      if (typeof data === 'object') {
        return JSON.stringify(data);
      } else if (typeof data === 'function') {
        // Execute the function and recursively process its result
        return Helper.optionalData(data());
      } else {
        return String(data);
      }
    } catch (e) {
      console.error("Error processing optional data:", e, data);
      return ''; // Return empty string on error
    }
  }

  static isExternalHost(linkElement) {
    // Checks if a link's hostname is different from the current page's hostname
    // and if the protocol is http or https
    return linkElement.hostname !== window.location.hostname &&
           (linkElement.protocol === 'http:' || linkElement.protocol === 'https:');
 }

}

// --- Cookie Class ---
export class Cookie {
  static prefix() {
    // Use the configured pixel function name for cookie prefix
    return `__${PIXEL_FUNC_NAME}_`;
  }

  static set(name, value, minutes, path = '/', domain = null, sameSite = 'Lax', secure = false) {
    let expires = '';
    if (Helper.isPresent(minutes)) {
      const date = new Date();
      date.setTime(date.getTime() + (minutes * 60 * 1000));
      expires = `expires=${date.toUTCString()}; `; // Use toUTCString for consistency
    }

    let cookieString = `${this.prefix()}${name}=${encodeURIComponent(value)}; ${expires}path=${path}; SameSite=${sameSite}`;

    // Add domain if specified
    if (domain) {
        cookieString += `; domain=${domain}`;
    }

    // Add Secure flag if specified (should be true if served over HTTPS)
    if (secure) {
        cookieString += `; Secure`;
    }

    document.cookie = cookieString;
  }

  static get(name) {
    const prefixedName = `${this.prefix()}${name}=`;
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') {
        c = c.substring(1);
      }
      if (c.indexOf(prefixedName) === 0) {
        try {
            return decodeURIComponent(c.substring(prefixedName.length, c.length));
        } catch(e) {
            console.error(`Error decoding cookie ${name}:`, e);
            return c.substring(prefixedName.length, c.length); // Return raw value on error
        }
      }
    }
    return null; // Return null if not found
  }

  static delete(name, path = '/', domain = null) {
    // Set expiry date to the past to delete the cookie
    this.set(name, '', -100, path, domain);
  }

  static exists(name) {
    return Helper.isPresent(this.get(name));
  }

  static setUtms() {
    // List of UTM parameters to check in the URL
    const utmParams = [
        'utm_source', 'utm_medium', 'utm_term', 'utm_content', 'utm_campaign',
        'utm_source_platform', 'utm_creative_format', 'utm_marketing_tactic'
        // Add any other relevant parameters here (e.g., gclid, fbclid)
    ];
    let utmValues = {};
    let foundUtm = false;

    utmParams.forEach(param => {
        const value = Url.getParameterByName(param);
        if (Helper.isPresent(value)) {
            utmValues[param] = value;
            foundUtm = true;
        }
    });

    // If any UTM parameters were found in the URL, save them in a session cookie
    if (foundUtm) {
        try {
            const jsonValue = JSON.stringify(utmValues);
            // Set as a session cookie (expires when browser closes) by omitting expiry time
            this.set('utm', jsonValue, null); // null expiry means session cookie
            console.log("UTM parameters saved to session cookie:", utmValues);
        } catch (e) {
            console.error("Error saving UTM parameters to cookie:", e);
        }
    }
  }

  static getUtm(name) {
    // Retrieve a specific UTM value from the 'utm' cookie
    if (this.exists('utm')) {
      try {
        const utms = JSON.parse(this.get('utm'));
        return utms && Helper.isPresent(utms[name]) ? utms[name] : '';
      } catch (e) {
        console.error("Error parsing UTM cookie:", e);
        return ''; // Return empty string on error
      }
    }
    return ''; // Return empty string if 'utm' cookie doesn't exist
  }
}

// --- Browser Class ---
export class Browser {
  static nameAndVersion() {
    // Basic browser detection (can be expanded or replaced with a more robust library if needed)
    const ua = navigator.userAgent;
    let tem;
    let M = ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];
    if (/trident/i.test(M[1])) {
      tem = /\brv[ :]+(\d+)/g.exec(ua) || [];
      return `IE ${tem[1] || ''}`;
    }
    if (M[1] === 'Chrome') {
      tem = ua.match(/\b(OPR|Edg)\/(\d+)/); // Updated to detect Edge Chromium (Edg)
      if (tem != null) return tem.slice(1).join(' ').replace('OPR', 'Opera').replace('Edg', 'Edge');
    }
    M = M[2] ? [M[1], M[2]] : [navigator.appName, navigator.appVersion, '-?'];
    tem = ua.match(/version\/(\d+)/i);
    if (tem != null) M.splice(1, 1, tem[1]);
    return M.join(' ');
  }

  static isMobile() {
    // Basic mobile detection
    let check = false;
    (function(a){
        if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4)))
            check = true;
    })(navigator.userAgent||navigator.vendor||window.opera);
    // Also check touch capabilities for broader compatibility
    return check || ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0);
  }

  static userAgent() {
    return window.navigator.userAgent;
  }
}

// --- URL Class ---
export class Url {
  static getParameterByName(name, url = window.location.href) {
    // Decodes URL parameters safely
    name = name.replace(/[\[\]]/g, '\\$&');
    const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`, 'i');
    const results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    try {
        return decodeURIComponent(results[2].replace(/\+/g, ' '));
    } catch (e) {
        console.error(`Error decoding URL parameter ${name}:`, e);
        return results[2].replace(/\+/g, ' '); // Return raw value on error
    }
  }
} 