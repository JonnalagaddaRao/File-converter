/**
 * OmniConvert - Modern Client-Side Image Converter & PDF Suite
 * Pure Vanilla JavaScript (ES6+) - Zero Backend, Zero Build Tools
 */

(() => {
  'use strict';

  /* ==========================================================================
     1. State Management
     ========================================================================== */
  const state = {
    files: [],            // Array of file records: { id, file, name, size, type, objectUrl, width, height }
    dragCounter: 0,       // Counter to prevent jitter on dragenter/dragleave
    isProcessing: false,  // Flag during conversion
    activeRoute: 'home',  // Current SPA route
    lastDownloadUrl: null // Keep reference for re-download link
  };

  /* ==========================================================================
     2. DOM Element Selectors
     ========================================================================== */
  const DOM = {
    // Theme & Navigation
    themeToggle: document.getElementById('theme-toggle'),
    mobileMenuBtn: document.getElementById('mobile-menu-btn'),
    mobileDrawer: document.getElementById('mobile-drawer'),
    navLinks: document.querySelectorAll('.nav-link'),
    mobileNavLinks: document.querySelectorAll('.mobile-nav-link'),
    viewSections: document.querySelectorAll('.view-section'),

    // Studio View
    studioCategory: document.getElementById('studio-category'),
    studioTitle: document.getElementById('studio-title'),
    studioDesc: document.getElementById('studio-desc'),
    btnClearAll: document.getElementById('btn-clear-all'),

    // Dropzone & Inputs
    dropzone: document.getElementById('dropzone'),
    fileInput: document.getElementById('file-input'),
    fileInputAdd: document.getElementById('file-input-add'),

    // Queue & Thumbnails
    queueToolbar: document.getElementById('queue-toolbar'),
    queueContainer: document.getElementById('queue-container'),
    thumbnailGrid: document.getElementById('thumbnail-grid'),
    emptyState: document.getElementById('empty-state'),
    statCount: document.getElementById('stat-count'),
    statSize: document.getElementById('stat-size'),

    // Settings Controls
    targetFormat: document.getElementById('target-format'),
    formatHint: document.getElementById('format-hint'),
    pdfOptions: document.getElementById('pdf-options'),
    pdfOrientation: document.getElementById('pdf-orientation'),
    pdfPageSize: document.getElementById('pdf-page-size'),
    pdfMargin: document.getElementById('pdf-margin'),
    pdfFit: document.getElementById('pdf-fit'),

    imageOptions: document.getElementById('image-options'),
    imageQuality: document.getElementById('image-quality'),
    qualityVal: document.getElementById('quality-val'),
    qualitySettingGroup: document.getElementById('quality-setting-group'),
    bgColorGroup: document.getElementById('bg-color-group'),
    bgColorPicker: document.getElementById('bg-color-picker'),
    imageScale: document.getElementById('image-scale'),
    outputFilename: document.getElementById('output-filename'),

    // Action & Progress
    btnConvert: document.getElementById('btn-convert'),
    btnConvertText: document.getElementById('btn-convert-text'),
    btnSpinner: document.querySelector('.btn-spinner'),
    btnActionIcon: document.querySelector('.btn-action-icon'),
    progressContainer: document.getElementById('progress-container'),
    progressStatusText: document.getElementById('progress-status-text'),
    progressPercent: document.getElementById('progress-percent'),
    progressFill: document.getElementById('progress-fill'),
    completionBanner: document.getElementById('completion-banner'),
    completionMsg: document.getElementById('completion-msg'),
    btnRedownload: document.getElementById('btn-redownload'),

    // Toast Container
    toastContainer: document.getElementById('toast-container')
  };

  /* ==========================================================================
     3. Toast Notification Service
     ========================================================================== */
  const Toast = {
    show(message, type = 'info', duration = 3500) {
      if (!DOM.toastContainer) return;

      const toast = document.createElement('div');
      toast.className = `toast toast-${type}`;

      const iconSvg = {
        success: `<svg class="toast-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`,
        error: `<svg class="toast-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`,
        warning: `<svg class="toast-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`,
        info: `<svg class="toast-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`
      }[type] || '';

      toast.innerHTML = `
        ${iconSvg}
        <span class="toast-message">${message}</span>
        <button class="toast-close" aria-label="Close notification">&times;</button>
      `;

      const dismiss = () => {
        toast.classList.add('toast-exit');
        toast.addEventListener('animationend', () => {
          if (toast.parentElement) toast.remove();
        }, { once: true });
      };

      toast.querySelector('.toast-close').addEventListener('click', dismiss);
      DOM.toastContainer.appendChild(toast);

      if (duration > 0) {
        setTimeout(dismiss, duration);
      }
    }
  };

  /* ==========================================================================
     4. Theme Management (Light / Dark Mode)
     ========================================================================== */
  const ThemeManager = {
    STORAGE_KEY: 'omni_theme_pref',

    init() {
      const savedTheme = localStorage.getItem(this.STORAGE_KEY);
      if (savedTheme) {
        this.setTheme(savedTheme);
      } else {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        this.setTheme(prefersDark ? 'dark' : 'light');
      }

      DOM.themeToggle.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme') || 'dark';
        const next = current === 'dark' ? 'light' : 'dark';
        this.setTheme(next);
        Toast.show(`Switched to ${next} theme`, 'info', 1800);
      });

      // Listen for OS system theme changes
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem(this.STORAGE_KEY)) {
          this.setTheme(e.matches ? 'dark' : 'light');
        }
      });
    },

    setTheme(theme) {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem(this.STORAGE_KEY, theme);
    }
  };

  /* ==========================================================================
     5. SPA Hash Router
     ========================================================================== */
  const Router = {
    routes: {
      'home': { viewId: 'view-home', title: 'OmniConvert | Client-Side Image & PDF Suite' },
      'image-to-pdf': { viewId: 'view-converter', title: 'Image to PDF | OmniConvert', preset: 'pdf' },
      'format-converter': { viewId: 'view-converter', title: 'Image Format Converter | OmniConvert', preset: 'format' },
      'jpg-to-png': { viewId: 'view-converter', title: 'JPG to PNG Converter | OmniConvert', preset: 'png' },
      'png-to-jpg': { viewId: 'view-converter', title: 'PNG to JPG Converter | OmniConvert', preset: 'jpeg' },
      'webp-converter': { viewId: 'view-converter', title: 'WebP Image Converter | OmniConvert', preset: 'webp' },
      'privacy': { viewId: 'view-privacy', title: 'Privacy & Security Policy | OmniConvert' },
      'about': { viewId: 'view-about', title: 'About OmniConvert | Modern Vanilla Suite' }
    },

    init() {
      window.addEventListener('hashchange', () => this.handleRoute());
      // Handle mobile drawer toggles
      DOM.mobileMenuBtn.addEventListener('click', () => {
        DOM.mobileDrawer.classList.toggle('open');
      });

      // Close mobile drawer when clicking links
      DOM.mobileNavLinks.forEach(link => {
        link.addEventListener('click', () => {
          DOM.mobileDrawer.classList.remove('open');
        });
      });

      this.handleRoute();
    },

    handleRoute() {
      const hash = (window.location.hash.slice(1) || 'home').toLowerCase();
      const routeConfig = this.routes[hash] || this.routes['home'];
      const targetRouteKey = this.routes[hash] ? hash : 'home';
      state.activeRoute = targetRouteKey;

      // Update Document Title
      document.title = routeConfig.title;

      // Update View Sections Visibility
      DOM.viewSections.forEach(section => {
        if (section.id === routeConfig.viewId) {
          section.classList.add('active');
        } else {
          section.classList.remove('active');
        }
      });

      // Update Navigation Links Active State
      const activeNavKey = (targetRouteKey === 'jpg-to-png' || targetRouteKey === 'png-to-jpg' || targetRouteKey === 'webp-converter') 
        ? 'format-converter' 
        : targetRouteKey;

      DOM.navLinks.forEach(link => {
        link.classList.toggle('active', link.getAttribute('data-nav') === activeNavKey);
      });
      DOM.mobileNavLinks.forEach(link => {
        link.classList.toggle('active', link.getAttribute('data-nav') === activeNavKey);
      });

      // Apply presets if entering the Converter Studio
      if (routeConfig.preset) {
        this.applyStudioPreset(routeConfig.preset);
      }

      // Scroll smoothly to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    applyStudioPreset(preset) {
      if (preset === 'pdf') {
        DOM.targetFormat.value = 'pdf';
        DOM.studioCategory.textContent = 'Image to PDF Studio';
        DOM.studioTitle.textContent = 'Convert Images to PDF';
        DOM.studioDesc.textContent = 'Merge, reorder, and compile multiple images into a printable PDF document.';
      } else if (preset === 'png') {
        DOM.targetFormat.value = 'png';
        DOM.studioCategory.textContent = 'JPG to PNG Studio';
        DOM.studioTitle.textContent = 'Convert JPG to PNG';
        DOM.studioDesc.textContent = 'Convert photos to lossless PNG format with zero server uploads.';
      } else if (preset === 'jpeg') {
        DOM.targetFormat.value = 'jpeg';
        DOM.studioCategory.textContent = 'PNG to JPG Studio';
        DOM.studioTitle.textContent = 'Convert PNG to JPG';
        DOM.studioDesc.textContent = 'Convert PNG images to compact JPGs with custom background color.';
      } else if (preset === 'webp') {
        DOM.targetFormat.value = 'webp';
        DOM.studioCategory.textContent = 'WebP Converter Studio';
        DOM.studioTitle.textContent = 'Convert to WebP';
        DOM.studioDesc.textContent = 'Optimize photos to next-generation WebP format for fast web delivery.';
      } else if (preset === 'format') {
        DOM.targetFormat.value = 'png';
        DOM.studioCategory.textContent = 'Format Converter Studio';
        DOM.studioTitle.textContent = 'Image Format Converter';
        DOM.studioDesc.textContent = 'Transcode between PNG, JPG, and WebP with quality and scaling control.';
      }

      App.updateSettingsUI();
    }
  };

  /* ==========================================================================
     6. File Processing & Queue Management
     ========================================================================== */
  const FileManager = {
    ALLOWED_TYPES: ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/bmp', 'image/gif'],

    init() {
      // Dropzone Drag and Drop
      ['dragenter', 'dragover'].forEach(eventName => {
        DOM.dropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          state.dragCounter++;
          DOM.dropzone.classList.add('dragover');
        });
      });

      ['dragleave', 'dragend'].forEach(eventName => {
        DOM.dropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          state.dragCounter--;
          if (state.dragCounter <= 0) {
            state.dragCounter = 0;
            DOM.dropzone.classList.remove('dragover');
          }
        });
      });

      DOM.dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        state.dragCounter = 0;
        DOM.dropzone.classList.remove('dragover');

        if (e.dataTransfer && e.dataTransfer.files) {
          this.handleIncomingFiles(e.dataTransfer.files);
        }
      });

      // Dropzone Click / Keyboard Activation
      DOM.dropzone.addEventListener('click', () => DOM.fileInput.click());
      DOM.dropzone.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          DOM.fileInput.click();
        }
      });

      // File Input Handlers
      DOM.fileInput.addEventListener('change', (e) => {
        if (e.target.files) this.handleIncomingFiles(e.target.files);
        e.target.value = ''; // Reset input to allow re-selection
      });

      DOM.fileInputAdd.addEventListener('change', (e) => {
        if (e.target.files) this.handleIncomingFiles(e.target.files);
        e.target.value = '';
      });

      // Clear All Button
      DOM.btnClearAll.addEventListener('click', () => {
        if (state.files.length === 0) return;
        this.clearAll();
        Toast.show('All images cleared', 'info', 2000);
      });

      // Clipboard Paste Support (Ctrl+V)
      window.addEventListener('paste', (e) => {
        // Don't intercept paste inside text inputs
        if (e.target.tagName === 'INPUT' && e.target.type === 'text') return;

        const items = e.clipboardData && e.clipboardData.items;
        if (!items) return;

        const pastedFiles = [];
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
            const blob = items[i].getAsFile();
            if (blob) {
              pastedFiles.push(new File([blob], `pasted-image-${Date.now()}.png`, { type: blob.type }));
            }
          }
        }

        if (pastedFiles.length > 0) {
          // If on home view, switch to converter view
          if (state.activeRoute === 'home') {
            window.location.hash = '#image-to-pdf';
          }
          this.handleIncomingFiles(pastedFiles);
          Toast.show(`Pasted ${pastedFiles.length} image(s) from clipboard!`, 'success');
        }
      });
    },

    async handleIncomingFiles(fileList) {
      const validFiles = [];
      let rejectedCount = 0;

      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        if (this.ALLOWED_TYPES.includes(file.type) || file.type.startsWith('image/')) {
          validFiles.push(file);
        } else {
          rejectedCount++;
        }
      }

      if (rejectedCount > 0) {
        Toast.show(`Skipped ${rejectedCount} non-image file(s)`, 'warning');
      }

      if (validFiles.length === 0) return;

      // Process metadata for each file
      for (const file of validFiles) {
        const fileId = 'img_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
        const objectUrl = URL.createObjectURL(file);

        try {
          const dims = await this.getImageDimensions(objectUrl);
          state.files.push({
            id: fileId,
            file: file,
            name: file.name,
            size: file.size,
            type: file.type,
            objectUrl: objectUrl,
            width: dims.width,
            height: dims.height
          });
        } catch (err) {
          console.error('Error loading image preview:', err);
          Toast.show(`Failed to read "${file.name}"`, 'error');
          URL.revokeObjectURL(objectUrl);
        }
      }

      this.renderQueue();
      App.updateSettingsUI();
      Toast.show(`Added ${validFiles.length} image(s) to queue`, 'success');
    },

    getImageDimensions(url) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
        img.onerror = () => reject(new Error('Image failed to load'));
        img.src = url;
      });
    },

    removeFile(id) {
      const index = state.files.findIndex(f => f.id === id);
      if (index !== -1) {
        URL.revokeObjectURL(state.files[index].objectUrl);
        state.files.splice(index, 1);
        this.renderQueue();
        App.updateSettingsUI();
      }
    },

    moveFile(index, direction) {
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= state.files.length) return;

      const [item] = state.files.splice(index, 1);
      state.files.splice(targetIndex, 0, item);
      this.renderQueue();
    },

    clearAll() {
      state.files.forEach(f => URL.revokeObjectURL(f.objectUrl));
      state.files = [];
      this.renderQueue();
      App.updateSettingsUI();
      DOM.completionBanner.classList.add('hidden');
      DOM.progressContainer.classList.add('hidden');
    },

    renderQueue() {
      const count = state.files.length;
      DOM.statCount.textContent = count;

      const totalBytes = state.files.reduce((acc, f) => acc + f.size, 0);
      DOM.statSize.textContent = this.formatFileSize(totalBytes);

      if (count === 0) {
        DOM.queueToolbar.classList.add('hidden');
        DOM.queueContainer.classList.add('hidden');
        DOM.emptyState.classList.remove('hidden');
        DOM.btnClearAll.classList.add('hidden');
        DOM.btnConvert.disabled = true;
        DOM.thumbnailGrid.innerHTML = '';
        return;
      }

      DOM.queueToolbar.classList.remove('hidden');
      DOM.queueContainer.classList.remove('hidden');
      DOM.emptyState.classList.add('hidden');
      DOM.btnClearAll.classList.remove('hidden');
      DOM.btnConvert.disabled = false;

      // Render Thumbnail Cards
      DOM.thumbnailGrid.innerHTML = '';

      state.files.forEach((fileItem, idx) => {
        const card = document.createElement('div');
        card.className = 'thumb-card';
        card.setAttribute('draggable', 'true');
        card.dataset.id = fileItem.id;
        card.dataset.index = idx;

        const isFirst = idx === 0;
        const isLast = idx === state.files.length - 1;

        card.innerHTML = `
          <div class="thumb-index-badge">${idx + 1}</div>
          <div class="thumb-image-wrapper">
            <img src="${fileItem.objectUrl}" alt="${this.escapeHtml(fileItem.name)}" loading="lazy">
          </div>
          <div class="thumb-details">
            <span class="thumb-filename" title="${this.escapeHtml(fileItem.name)}">${this.escapeHtml(fileItem.name)}</span>
            <div class="thumb-meta">
              <span>${fileItem.width}×${fileItem.height}</span>
              <span>${this.formatFileSize(fileItem.size)}</span>
            </div>
          </div>
          <div class="thumb-controls">
            <div class="thumb-reorder-group">
              <button type="button" class="btn-thumb-icon btn-move-up" title="Move page up" ${isFirst ? 'disabled' : ''}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="18 15 12 9 6 15"></polyline>
                </svg>
              </button>
              <button type="button" class="btn-thumb-icon btn-move-down" title="Move page down" ${isLast ? 'disabled' : ''}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
            </div>
            <button type="button" class="btn-thumb-icon btn-thumb-delete" title="Remove image">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        `;

        // Event listeners for card controls
        card.querySelector('.btn-thumb-delete').addEventListener('click', (e) => {
          e.stopPropagation();
          this.removeFile(fileItem.id);
        });

        const upBtn = card.querySelector('.btn-move-up');
        if (upBtn && !isFirst) {
          upBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.moveFile(idx, -1);
          });
        }

        const downBtn = card.querySelector('.btn-move-down');
        if (downBtn && !isLast) {
          downBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.moveFile(idx, 1);
          });
        }

        // Card HTML5 Drag and Drop Reordering
        this.setupCardDragReorder(card, idx);

        DOM.thumbnailGrid.appendChild(card);
      });
    },

    setupCardDragReorder(card, idx) {
      card.addEventListener('dragstart', (e) => {
        card.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', idx.toString());
      });

      card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
        document.querySelectorAll('.thumb-card').forEach(c => c.classList.remove('drag-target'));
      });

      card.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        card.classList.add('drag-target');
      });

      card.addEventListener('dragleave', () => {
        card.classList.remove('drag-target');
      });

      card.addEventListener('drop', (e) => {
        e.preventDefault();
        card.classList.remove('drag-target');
        const fromIdx = parseInt(e.dataTransfer.getData('text/plain'), 10);
        const toIdx = idx;

        if (!isNaN(fromIdx) && fromIdx !== toIdx) {
          const [movedItem] = state.files.splice(fromIdx, 1);
          state.files.splice(toIdx, 0, movedItem);
          FileManager.renderQueue();
        }
      });
    },

    formatFileSize(bytes) {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    },

    escapeHtml(str) {
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    }
  };

  /* ==========================================================================
     7. Image & Canvas Conversion Engine
     ========================================================================= */
  const ImageConverterEngine = {
    /**
     * Converts an image file to a specified format using Offscreen Canvas
     * @param {Object} fileItem 
     * @param {string} targetMime ('image/jpeg', 'image/png', 'image/webp')
     * @param {number} quality (0.1 to 1.0)
     * @param {number} scale (0.25 to 1.0)
     * @param {string} fillColor (hex code for background fill)
     * @returns {Promise<Blob>}
     */
    async convertImage(fileItem, targetMime, quality, scale, fillColor) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';

        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            const targetWidth = Math.max(1, Math.round(img.naturalWidth * scale));
            const targetHeight = Math.max(1, Math.round(img.naturalHeight * scale));

            canvas.width = targetWidth;
            canvas.height = targetHeight;
            const ctx = canvas.getContext('2d');

            // If output format does not support transparency (JPEG), fill background
            if (targetMime === 'image/jpeg') {
              ctx.fillStyle = fillColor || '#ffffff';
              ctx.fillRect(0, 0, targetWidth, targetHeight);
            }

            // Draw image with smooth rendering
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

            canvas.toBlob(
              (blob) => {
                if (blob) {
                  resolve(blob);
                } else {
                  reject(new Error('Canvas conversion produced null blob'));
                }
              },
              targetMime,
              quality
            );
          } catch (err) {
            reject(err);
          }
        };

        img.onerror = () => reject(new Error(`Failed to load image for canvas: ${fileItem.name}`));
        img.src = fileItem.objectUrl;
      });
    },

    /**
     * Converts image to DataURL for jsPDF insertion
     */
    async getImageDataUrl(fileItem, quality = 0.92) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';

        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d');

            ctx.drawImage(img, 0, 0);
            const dataUrl = canvas.toDataURL('image/jpeg', quality);
            resolve({
              dataUrl,
              width: img.naturalWidth,
              height: img.naturalHeight
            });
          } catch (err) {
            reject(err);
          }
        };

        img.onerror = () => reject(new Error('Could not read image for PDF generation'));
        img.src = fileItem.objectUrl;
      });
    }
  };

  /* ==========================================================================
     8. PDF Generation Engine (jsPDF)
     ========================================================================== */
  const PdfEngine = {
    // Millimeter standard dimensions
    PAGE_SIZES_MM: {
      a4: { width: 210, height: 297 },
      letter: { width: 215.9, height: 279.4 }
    },

    MARGINS_MM: {
      none: 0,
      small: 10,
      normal: 20,
      large: 30
    },

    async generatePdf(fileList, options, onProgress) {
      if (!window.jspdf || !window.jspdf.jsPDF) {
        throw new Error('jsPDF library failed to load from CDN. Please check your internet connection.');
      }

      const { jsPDF } = window.jspdf;
      let doc = null;
      const total = fileList.length;

      for (let i = 0; i < total; i++) {
        const fileItem = fileList[i];
        if (onProgress) onProgress(i, total, `Rendering image ${i + 1} of ${total} into PDF...`);

        // Get Image Data
        const imgInfo = await ImageConverterEngine.getImageDataUrl(fileItem, options.quality);

        // Determine orientation
        let orientation = options.orientation;
        if (orientation === 'auto') {
          orientation = imgInfo.width >= imgInfo.height ? 'landscape' : 'portrait';
        } else {
          orientation = orientation === 'l' ? 'landscape' : 'portrait';
        }

        // Determine page dimensions
        let pageWidth, pageHeight;
        const margin = this.MARGINS_MM[options.margin] || 0;

        if (options.pageSize === 'fit') {
          // In fit mode, page dimensions match the image aspect ratio exactly + margins
          const aspect = imgInfo.width / imgInfo.height;
          const baseDim = 210; // reference base dimension in mm
          if (orientation === 'landscape') {
            pageWidth = baseDim * (aspect >= 1 ? aspect : 1.4);
            pageHeight = baseDim;
          } else {
            pageWidth = baseDim;
            pageHeight = baseDim / aspect;
          }
        } else {
          const standardSize = this.PAGE_SIZES_MM[options.pageSize] || this.PAGE_SIZES_MM.a4;
          if (orientation === 'landscape') {
            pageWidth = Math.max(standardSize.width, standardSize.height);
            pageHeight = Math.min(standardSize.width, standardSize.height);
          } else {
            pageWidth = Math.min(standardSize.width, standardSize.height);
            pageHeight = Math.max(standardSize.width, standardSize.height);
          }
        }

        // Create or Add Page
        if (i === 0) {
          doc = new jsPDF({
            orientation: orientation === 'landscape' ? 'l' : 'p',
            unit: 'mm',
            format: [pageWidth, pageHeight]
          });
        } else {
          doc.addPage([pageWidth, pageHeight], orientation === 'landscape' ? 'l' : 'p');
        }

        // Calculate image placement inside printable area
        const printableWidth = Math.max(1, pageWidth - (margin * 2));
        const printableHeight = Math.max(1, pageHeight - (margin * 2));

        let renderWidth, renderHeight, posX, posY;

        if (options.fit === 'fill') {
          renderWidth = printableWidth;
          renderHeight = printableHeight;
          posX = margin;
          posY = margin;
        } else {
          // 'contain' - preserve aspect ratio
          const imgAspect = imgInfo.width / imgInfo.height;
          const printableAspect = printableWidth / printableHeight;

          if (imgAspect > printableAspect) {
            renderWidth = printableWidth;
            renderHeight = printableWidth / imgAspect;
            posX = margin;
            posY = margin + ((printableHeight - renderHeight) / 2);
          } else {
            renderHeight = printableHeight;
            renderWidth = printableHeight * imgAspect;
            posX = margin + ((printableWidth - renderWidth) / 2);
            posY = margin;
          }
        }

        // Draw image onto PDF page
        doc.addImage(
          imgInfo.dataUrl,
          'JPEG',
          posX,
          posY,
          renderWidth,
          renderHeight,
          undefined,
          'FAST'
        );
      }

      if (onProgress) onProgress(total, total, 'Compiling PDF document structure...');
      return doc.output('blob');
    }
  };

  /* ==========================================================================
     9. ZIP Archiving Engine (JSZip)
     ========================================================================== */
  const ZipEngine = {
    async createZip(filesWithBlobs, onProgress) {
      if (!window.JSZip) {
        throw new Error('JSZip library failed to load from CDN. Please check your connection.');
      }

      const zip = new JSZip();

      filesWithBlobs.forEach(({ name, blob }) => {
        zip.file(name, blob);
      });

      return await zip.generateAsync(
        {
          type: 'blob',
          compression: 'DEFLATE',
          compressionOptions: { level: 6 }
        },
        (metadata) => {
          if (onProgress) {
            onProgress(metadata.percent, `Packaging ZIP archive: ${Math.round(metadata.percent)}%`);
          }
        }
      );
    }
  };

  /* ==========================================================================
     10. Main Application Controller
     ========================================================================== */
  const App = {
    init() {
      ThemeManager.init();
      Router.init();
      FileManager.init();
      this.bindSettingsEvents();
      this.bindActionEvents();
      this.updateSettingsUI();
    },

    bindSettingsEvents() {
      DOM.targetFormat.addEventListener('change', () => this.updateSettingsUI());

      // Quality Slider Live Readout
      DOM.imageQuality.addEventListener('input', (e) => {
        DOM.qualityVal.textContent = `${e.target.value}%`;
      });
    },

    bindActionEvents() {
      DOM.btnConvert.addEventListener('click', () => this.handleConversion());
    },

    updateSettingsUI() {
      const format = DOM.targetFormat.value;
      const fileCount = state.files.length;

      if (format === 'pdf') {
        DOM.pdfOptions.classList.remove('hidden');
        DOM.imageOptions.classList.add('hidden');
        DOM.formatHint.textContent = 'All images will be merged into a single multi-page PDF document.';
        DOM.btnConvertText.textContent = fileCount > 1 
          ? `Compile ${fileCount} Images to PDF` 
          : 'Convert & Download PDF';
      } else {
        DOM.pdfOptions.classList.add('hidden');
        DOM.imageOptions.classList.remove('hidden');

        const extMap = { png: 'PNG', jpeg: 'JPG', webp: 'WebP' };
        const ext = extMap[format] || format.toUpperCase();

        // Background color picker is primarily for JPG since JPG lacks alpha support
        DOM.bgColorGroup.style.display = (format === 'jpeg') ? 'flex' : 'none';

        if (fileCount > 1) {
          DOM.formatHint.textContent = `Each image will be converted to ${ext} and bundled into a .ZIP archive.`;
          DOM.btnConvertText.textContent = `Convert ${fileCount} Files & Download (ZIP)`;
        } else {
          DOM.formatHint.textContent = `The image will be converted to ${ext} format.`;
          DOM.btnConvertText.textContent = `Convert & Download ${ext}`;
        }
      }

      DOM.btnConvert.disabled = fileCount === 0 || state.isProcessing;
    },

    async handleConversion() {
      if (state.files.length === 0 || state.isProcessing) return;

      state.isProcessing = true;
      this.setProcessingState(true);
      DOM.completionBanner.classList.add('hidden');

      const format = DOM.targetFormat.value;
      const baseFilename = (DOM.outputFilename.value.trim() || 'omni-converted')
        .replace(/[^a-zA-Z0-9_\-]/g, '_');
      const quality = parseInt(DOM.imageQuality.value, 10) / 100;
      const scale = parseFloat(DOM.imageScale.value) || 1.0;
      const fillColor = DOM.bgColorPicker.value || '#ffffff';

      try {
        if (format === 'pdf') {
          // --- PDF Generation ---
          const pdfOptions = {
            orientation: DOM.pdfOrientation.value,
            pageSize: DOM.pdfPageSize.value,
            margin: DOM.pdfMargin.value,
            fit: DOM.pdfFit.value,
            quality: quality
          };

          const pdfBlob = await PdfEngine.generatePdf(state.files, pdfOptions, (current, total, msg) => {
            const pct = Math.round((current / total) * 95);
            this.updateProgress(pct, msg);
          });

          this.updateProgress(100, 'Finalizing PDF document...');
          const filename = `${baseFilename}.pdf`;
          this.triggerDownload(pdfBlob, filename);
          this.showCompletion(`Successfully generated "${filename}" (${FileManager.formatFileSize(pdfBlob.size)})`);
          Toast.show('PDF created and downloaded successfully!', 'success');

        } else {
          // --- Image Format Conversion ---
          const mimeMap = {
            png: 'image/png',
            jpeg: 'image/jpeg',
            webp: 'image/webp'
          };
          const targetMime = mimeMap[format] || 'image/jpeg';
          const ext = format === 'jpeg' ? 'jpg' : format;
          const totalFiles = state.files.length;

          if (totalFiles === 1) {
            // Single Image Direct Download
            this.updateProgress(30, 'Transcoding image pixels...');
            const convertedBlob = await ImageConverterEngine.convertImage(
              state.files[0],
              targetMime,
              quality,
              scale,
              fillColor
            );

            this.updateProgress(100, 'Download starting...');
            const filename = `${baseFilename}.${ext}`;
            this.triggerDownload(convertedBlob, filename);
            this.showCompletion(`Successfully converted "${filename}" (${FileManager.formatFileSize(convertedBlob.size)})`);
            Toast.show(`Converted to ${ext.toUpperCase()} successfully!`, 'success');

          } else {
            // Multiple Images: Batch conversion & ZIP archive
            const convertedBlobs = [];

            for (let i = 0; i < totalFiles; i++) {
              const fileItem = state.files[i];
              const pct = Math.round(((i) / totalFiles) * 70);
              this.updateProgress(pct, `Converting image ${i + 1} of ${totalFiles} (${fileItem.name})...`);

              const blob = await ImageConverterEngine.convertImage(
                fileItem,
                targetMime,
                quality,
                scale,
                fillColor
              );

              // Extract original base name without extension
              const originalName = fileItem.name.substring(0, fileItem.name.lastIndexOf('.')) || fileItem.name;
              const cleanName = `${originalName}.${ext}`;

              convertedBlobs.push({
                name: cleanName,
                blob: blob
              });
            }

            // Create ZIP archive
            this.updateProgress(75, 'Packaging converted images into ZIP archive...');
            const zipBlob = await ZipEngine.createZip(convertedBlobs, (pct, status) => {
              const overallPct = 75 + Math.round((pct * 0.25));
              this.updateProgress(overallPct, status);
            });

            this.updateProgress(100, 'ZIP archive ready!');
            const zipFilename = `${baseFilename}-images.zip`;
            this.triggerDownload(zipBlob, zipFilename);
            this.showCompletion(`Successfully packaged ${totalFiles} images into "${zipFilename}" (${FileManager.formatFileSize(zipBlob.size)})`);
            Toast.show(`ZIP archive downloaded with ${totalFiles} files!`, 'success');
          }
        }
      } catch (err) {
        console.error('Conversion failed:', err);
        Toast.show(`Conversion error: ${err.message || 'Unknown failure'}`, 'error', 5000);
        this.updateProgress(0, 'Conversion failed');
      } finally {
        state.isProcessing = false;
        this.setProcessingState(false);
      }
    },

    setProcessingState(isProcessing) {
      if (isProcessing) {
        DOM.btnConvert.disabled = true;
        DOM.btnSpinner.classList.remove('hidden');
        DOM.btnActionIcon.classList.add('hidden');
        DOM.progressContainer.classList.remove('hidden');
        this.updateProgress(0, 'Initializing conversion engine...');
      } else {
        DOM.btnConvert.disabled = state.files.length === 0;
        DOM.btnSpinner.classList.add('hidden');
        DOM.btnActionIcon.classList.remove('hidden');
        this.updateSettingsUI();
      }
    },

    updateProgress(percent, statusText) {
      DOM.progressPercent.textContent = `${Math.round(percent)}%`;
      DOM.progressFill.style.width = `${Math.min(100, Math.max(0, percent))}%`;
      if (statusText) {
        DOM.progressStatusText.textContent = statusText;
      }
    },

    triggerDownload(blob, filename) {
      if (state.lastDownloadUrl) {
        URL.revokeObjectURL(state.lastDownloadUrl);
      }

      const downloadUrl = URL.createObjectURL(blob);
      state.lastDownloadUrl = downloadUrl;

      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      DOM.btnRedownload.onclick = (e) => {
        e.preventDefault();
        const reLink = document.createElement('a');
        reLink.href = downloadUrl;
        reLink.download = filename;
        document.body.appendChild(reLink);
        reLink.click();
        document.body.removeChild(reLink);
      };
    },

    showCompletion(message) {
      DOM.completionMsg.textContent = message;
      DOM.completionBanner.classList.remove('hidden');
    }
  };

  // Launch Application when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => App.init());
  } else {
    App.init();
  }

})();
