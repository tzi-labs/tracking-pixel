// vite.config.js
import { defineConfig, loadEnv } from 'vite';
import path from 'path';
import fs from 'fs/promises'; // Use fs.promises for async file operations
import fsSync from 'fs'; // Import sync fs for existsSync check
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
    SNIPPET_TEMPLATE_PATH: 'src/snippet-template.js', // Path to the snippet template - Re-added
    TRACKER_ID: env.OPIX_TRACKER_ID || 'YOUR-TRACKING-ID', // Default tracker ID (should be replaced)
  };
}

// --- Vite Plugin for Snippet Generation & index.html Processing --- (Modified)
function generateAndInjectPlugin(config) {
  // Path for the final index.html in the dist folder
  const INDEX_OUTPUT_PATH = path.join(config.DIST_FOLDER, 'index.html');
  // Path to the source index.html template in the project root
  const INDEX_TEMPLATE_PATH = path.resolve(__dirname, 'index.html');
  // Path to the snippet template
  const templatePath = path.resolve(__dirname, config.SNIPPET_TEMPLATE_PATH);
  
  // Check if template files exist before configuring the plugin
  if (!fsSync.existsSync(templatePath)) {
    console.error(`[Plugin Error] Snippet template not found at ${templatePath}`);
    return { name: 'generate-inject-error-snippet-missing' }; 
  }
   if (!fsSync.existsSync(INDEX_TEMPLATE_PATH)) {
    console.error(`[Plugin Error] index.html template not found at ${INDEX_TEMPLATE_PATH}`);
    return { name: 'generate-inject-error-index-missing' }; 
  }

  return {
    name: 'generate-and-inject',
    apply: 'build',
    enforce: 'post',
    async writeBundle() {
      try {
        // --- 1. Generate Snippet Code --- 
        console.log(`\n[Plugin] Generating snippet code...`);
        const pluginConfig = { ...config }; // Clone config for safety within plugin
        console.log(`[Plugin] Config used - JS Endpoint: ${pluginConfig.JS_ENDPOINT}, ID: ${pluginConfig.TRACKER_ID}, Func: ${pluginConfig.PIXEL_FUNC_NAME}`);

        let snippetTemplateContent = await fs.readFile(templatePath, 'utf-8');
        console.log(`[Plugin] Raw template content read (first 100 chars): ${snippetTemplateContent.substring(0,100)}...`);

        // Replace placeholders in snippet template
        let snippetCode = snippetTemplateContent
          .replace(/ID_PLACEHOLDER/g, pluginConfig.TRACKER_ID)
          // Focus logging on this replacement:
          .replace(/JS_ENDPOINT_PLACEHOLDER/g, (match) => {
              console.log(`[Plugin] Replacing found match "${match}" with "${pluginConfig.JS_ENDPOINT}"`);
              return pluginConfig.JS_ENDPOINT;
          })
          .replace(/OPIX_FUNC_PLACEHOLDER/g, pluginConfig.PIXEL_FUNC_NAME);
          
        console.log(`[Plugin] Snippet code *after all* replacements (before minify):\n---\n${snippetCode}\n---`);
        
        // Minify the generated snippet code
        console.log(`[Plugin] Minifying snippet code...`);
        const minifiedResult = await minify(snippetCode, {
            sourceMap: false, compress: true, mangle: true,
        });
        if (!minifiedResult.code) throw new Error("Terser minification failed for snippet.");
        
        const finalSnippetContent = `<!-- Start Simple Tracker Snippet -->\n<script>\n${minifiedResult.code}\n</script>\n<!-- End Simple Tracker Snippet -->`;
        console.log(`[Plugin] Final snippet content generated.`);
        
        // --- 2. Process index.html --- 
        console.log(`\n[Plugin] Processing index.html template...`);
        let indexTemplateContent = await fs.readFile(INDEX_TEMPLATE_PATH, 'utf-8');
        console.log(`[Plugin] Read index.html template (${indexTemplateContent.length} bytes).`);

        // Replace placeholders in index.html
        let finalIndexContent = indexTemplateContent
            .replace('<!-- SNIPPET_INJECTION_POINT -->', finalSnippetContent)
            .replace(/%%PIXEL_ENDPOINT%%/g, pluginConfig.PIXEL_ENDPOINT) // Use cloned config
            .replace(/%%FUNC_NAME%%/g, pluginConfig.PIXEL_FUNC_NAME); // Use cloned config
        
        console.log(`[Plugin] Placeholders replaced in index.html.`);
        
        // --- 3. Write dist/index.html --- 
        await fs.mkdir(pluginConfig.DIST_FOLDER, { recursive: true }); // Use cloned config
        await fs.writeFile(INDEX_OUTPUT_PATH, finalIndexContent);
        console.log(`[Plugin] Successfully wrote final index.html to ${INDEX_OUTPUT_PATH}`);

      } catch (error) {
        console.error(`[Plugin] Error: ${error.message}\n${error.stack}`);
        this.error(`Plugin failed: ${error.message}`); 
      }
    }
  };
}

// --- Vite Configuration ---
export default defineConfig(({ mode }) => {
  // Load environment variables based on the mode (development, production)
  const env = loadEnv(mode, process.cwd(), '');
  console.log('\n[vite.config.js] Loaded Environment Variables:\n', env);
  // Get configuration object
  const config = getConfig(env);
  // IMPORTANT: Pass a *clone* of the config to the plugin
  // This prevents potential issues if the config object is mutated elsewhere
  const pluginConfig = { ...config }; 

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
        fileName: () => path.basename(config.JS_ENDPOINT || 'tracker.min.js'),
      },
      // Use Terser for minification in production builds
      minify: 'terser',
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
      generateAndInjectPlugin(pluginConfig), // Pass the cloned config
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