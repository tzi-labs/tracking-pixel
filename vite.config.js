// vite.config.js
import { defineConfig, loadEnv } from 'vite';
import path from 'path';
import fs from 'fs/promises'; // Use fs.promises for async file operations
import { minify } from 'terser';

// --- Configuration ---
// Reads environment variables or uses defaults
function getConfig(env) {
  return {
    PIXEL_FUNC_NAME: env.OPIX_PIXEL_FUNC_NAME || 'strk', // Default function name
    PIXEL_ENDPOINT: env.OPIX_PIXEL_ENDPOINT || '/pixel.gif', // Default tracking endpoint
    JS_ENDPOINT: env.OPIX_JS_ENDPOINT || '/tracker.min.js', // Default path to the tracker script
    VERSION: env.OPIX_VERSION || '1', // Default version
    DIST_FOLDER: env.OPIX_DESTINATION_FOLDER || 'dist', // Default output folder
    SNIPPET_TEMPLATE_PATH: 'src/snippet-template.js', // Path to the snippet template
    TRACKER_ID: env.OPIX_TRACKER_ID || 'YOUR-TRACKING-ID', // Default tracker ID (should be replaced)
  };
}

// --- Vite Plugin for Snippet Generation ---
function generateSnippetPlugin(config) {
  const SNIPPET_OUTPUT_PATH = path.join(config.DIST_FOLDER, 'snippet.html');
  return {
    name: 'generate-snippet',
    apply: 'build', // Run only for build command
    enforce: 'post', // Run after the main build
    async writeBundle() { // Hook runs after bundle is written
      try {
        console.log(`Generating snippet from ${config.SNIPPET_TEMPLATE_PATH}...`);
        // Read the snippet template
        let templateContent = await fs.readFile(config.SNIPPET_TEMPLATE_PATH, 'utf-8');

        // Replace placeholders in the template
        const snippetCode = templateContent
          .replace('JS_ENDPOINT_PLACEHOLDER', config.JS_ENDPOINT)
          .replace(/OPIX_FUNC_PLACEHOLDER/g, config.PIXEL_FUNC_NAME)
          .replace('ID_PLACEHOLDER', config.TRACKER_ID);

        // Minify the snippet code using Terser
        const minifiedResult = await minify(snippetCode, {
            sourceMap: false,
            compress: true,
            mangle: true,
        });

        if (!minifiedResult.code) {
            throw new Error("Terser minification failed for snippet.");
        }

        // Construct the final HTML snippet
        const finalSnippetHtml = `<!-- Start Simple Tracker Snippet -->\n<script>\n${minifiedResult.code}\n</script>\n<!-- End Simple Tracker Snippet -->`;

        // Ensure the dist directory exists
        await fs.mkdir(config.DIST_FOLDER, { recursive: true });
        // Write the final snippet.html file
        await fs.writeFile(SNIPPET_OUTPUT_PATH, finalSnippetHtml);
        console.log(`Snippet successfully written to ${SNIPPET_OUTPUT_PATH}`);

      } catch (error) {
        // Log and report errors during snippet generation
        console.error(`Error generating snippet: ${error.message}\n${error.stack}`);
        this.error(`Failed to generate snippet: ${error.message}`);
      }
    }
  };
}

// --- Vite Configuration ---
export default defineConfig(({ mode }) => {
  // Load environment variables based on the mode (development, production)
  const env = loadEnv(mode, process.cwd(), '');
  // Get configuration object
  const config = getConfig(env);

  return {
    build: {
      outDir: config.DIST_FOLDER,
      // Clean the output directory before build, but only for production
      emptyOutDir: mode === 'production',
      lib: {
        // Entry point for the main tracker script
        entry: path.resolve(__dirname, 'src/index.js'),
        // Name for the library (used in UMD/global builds, less critical for IIFE)
        name: 'SimpleTrackerLib',
        // Output format as an Immediately Invoked Function Expression
        formats: ['iife'],
        // Output filename for the tracker script
        fileName: () => `tracker.min.js`,
      },
      // Use Terser for minification in production builds
      minify: mode === 'production' ? 'terser' : false,
      terserOptions: mode === 'production' ? {
        compress: {
          drop_console: true, // Remove console logs in production
        },
        mangle: true, // Obfuscate variable names
        format: {
            comments: false, // Remove comments
        }
      } : {},
      // Rollup specific options (if needed)
      rollupOptions: {
        output: {
          // Configure IIFE specific options if necessary
          // For IIFE, the library's exports are typically assigned to `window[name]`
          // We will handle attaching our function to the window inside src/index.js
        }
      },
    },
    plugins: [
      // Add the custom plugin to generate snippet.html
      generateSnippetPlugin(config),
    ],
    // Define global constants accessible within the source code (src/**.js)
    // These are replaced during the build process
    define: {
      '__PIXEL_FUNC_NAME__': JSON.stringify(config.PIXEL_FUNC_NAME),
      '__PIXEL_ENDPOINT__': JSON.stringify(config.PIXEL_ENDPOINT),
      '__VERSION__': JSON.stringify(config.VERSION),
      '__TRACKER_ID__': JSON.stringify(config.TRACKER_ID) // Make Tracker ID available if needed in core script
    },
    // Development server configuration
    server: {
      open: false, // Don't open the browser automatically
      watch: {
          // Ensure changes in src directory trigger rebuilds
          ignored: ['!**/src/**'],
      }
    },
    // Resolve .js extensions automatically when importing
    resolve: {
        extensions: ['.js']
    }
  };
}); 