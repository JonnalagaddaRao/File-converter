/**
 * OmniConvert — Production Server for Render Deployment
 *
 * Serves the static frontend (index.html, styles.css, app.js) from the same
 * origin so that any same-origin connections work correctly in production.
 *
 * - Binds to 0.0.0.0 (required by Render — not just localhost)
 * - Reads PORT from process.env.PORT (injected by Render at runtime)
 * - Falls back to port 3000 for local development
 * - Serves all static files from the current directory
 * - Returns index.html for any unmatched route (SPA hash-routing friendly)
 */

'use strict';

const express = require('express');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';           // Must be 0.0.0.0 on Render, not 127.0.0.1

// ---------------------------------------------------------------------------
// Static file serving — serve the project root directory
// ---------------------------------------------------------------------------
app.use(
  express.static(path.join(__dirname), {
    // Serve index.html for bare "/" automatically
    index: 'index.html',
    // Cache static assets in production, but keep HTML always fresh
    setHeaders(res, filePath) {
      if (path.extname(filePath) === '.html') {
        res.setHeader('Cache-Control', 'no-cache');
      } else {
        // CSS and JS can be cached for a day — bump the filename if you change them
        res.setHeader('Cache-Control', 'public, max-age=86400');
      }
    }
  })
);

// ---------------------------------------------------------------------------
// SPA fallback — any unknown path returns index.html so hash-routing works
// (e.g. a direct link to /#image-to-pdf doesn't 404)
// ---------------------------------------------------------------------------
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ---------------------------------------------------------------------------
// Start listening
// ---------------------------------------------------------------------------
app.listen(PORT, HOST, () => {
  console.log(`[OMNICONVERT] Server online → http://${HOST}:${PORT}`);
  console.log(`[OMNICONVERT] NODE_ENV=${process.env.NODE_ENV || 'development'}`);
});
