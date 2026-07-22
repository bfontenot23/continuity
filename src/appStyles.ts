/** Application-wide CSS, kept separate from DOM component builders. */
export function createAppStyles(): HTMLStyleElement {
  const style = document.createElement('style');
  style.textContent = `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: #f5f5f5;
      color: #333;
    }

    #app {
      display: flex;
      flex-direction: column;
      height: 100vh;
    }

    .topbar {
      background: #0f172a;
      color: #e2e8f0;
      padding: 0.65rem 1rem;
      border-bottom: 1px solid #1f2937;
      position: sticky;
      top: 0;
      z-index: 5;
    }

    .topbar-inner {
      max-width: 1400px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      min-width: 0;
    }

    .brand-copy {
      display: flex;
      flex-direction: column;
      line-height: 1.1;
    }

    .brand-title {
      font-weight: 700;
      font-size: 1rem;
      letter-spacing: 0.01em;
    }

    .brand-subtitle {
      font-size: 0.75rem;
      color: #94a3b8;
    }

    .topbar-actions {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-left: auto;
      flex-wrap: wrap;
      justify-content: flex-end;
    }

    .topbar-actions .btn {
      padding: 0.4rem 0.9rem;
      border-radius: 999px;
      font-weight: 600;
    }

    .export-menu {
      position: relative;
    }

    .export-menu-list {
      position: absolute;
      right: 0;
      top: calc(100% + 6px);
      background: #0b1220;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 10px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
      min-width: 180px;
      padding: 0.25rem;
      display: none;
      z-index: 10;
    }

    .export-menu.open .export-menu-list {
      display: block;
    }

    .export-option {
      width: 100%;
      text-align: left;
      padding: 0.55rem 0.75rem;
      background: transparent;
      border: none;
      color: #e2e8f0;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
    }

    .export-option:hover {
      background: rgba(255, 255, 255, 0.08);
    }

    .topbar .btn-primary {
      background: #22d3ee;
      color: #0f172a;
      font-weight: 700;
    }

    .topbar .btn-primary:hover {
      background: #06b6d4;
    }

    .topbar .btn-primary-gradient {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      font-weight: 700;
    }

    .topbar .btn-primary-gradient:hover {
      opacity: 0.9;
      transform: translateY(-1px);
    }

    .btn-ghost {
      background: rgba(255, 255, 255, 0.08);
      color: #e2e8f0;
      border: 1px solid rgba(255, 255, 255, 0.14);
    }

    .btn-ghost:hover {
      background: rgba(255, 255, 255, 0.16);
      border-color: rgba(255, 255, 255, 0.22);
    }

    .hamburger-menu-btn {
      display: none;
      flex-direction: column;
      background: none;
      border: none;
      cursor: pointer;
      padding: 0.5rem;
      gap: 0.35rem;
      margin-left: auto;
      position: relative;
      z-index: 11;
    }

    .hamburger-icon {
      width: 24px;
      height: 2px;
      background: #e2e8f0;
      border-radius: 2px;
      transition: all 0.3s ease;
      display: block;
    }

    .hamburger-menu-btn[aria-expanded="true"] .hamburger-icon:nth-child(1) {
      transform: rotate(45deg) translateY(10px);
    }

    .hamburger-menu-btn[aria-expanded="true"] .hamburger-icon:nth-child(2) {
      opacity: 0;
    }

    .hamburger-menu-btn[aria-expanded="true"] .hamburger-icon:nth-child(3) {
      transform: rotate(-45deg) translateY(-10px);
    }

    .hamburger-menu {
      display: none;
      position: absolute;
      top: calc(100% + 10px);
      right: 1rem;
      background: #0b1220;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 10px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
      min-width: 200px;
      padding: 0.25rem;
      z-index: 10;
    }

    .hamburger-menu.open {
      display: flex;
      flex-direction: column;
    }

    .hamburger-menu-item {
      width: 100%;
      text-align: left;
      padding: 0.75rem 1rem;
      background: transparent;
      border: none;
      color: #e2e8f0;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      font-size: 0.95rem;
      transition: background 0.2s ease;
    }

    .hamburger-menu-item:hover {
      background: rgba(255, 255, 255, 0.08);
    }

    @media (max-width: 720px) {
      .hamburger-menu-btn {
        display: flex;
      }

      #info-btn {
        display: none !important;
      }

      #changelog-btn {
        display: none !important;
      }

      #settings-btn {
        display: none !important;
      }

      .topbar-inner {
        align-items: center;
        position: relative;
        flex-wrap: nowrap;
        gap: 0.5rem;
      }

      .brand {
        flex-shrink: 0;
      }

      .topbar-actions {
        display: none;
        width: 100%;
        margin-left: 0;
        justify-content: flex-start;
        overflow-x: auto;
        padding-bottom: 0.25rem;
      }

      .topbar-actions::-webkit-scrollbar {
        display: none;
      }
    }

    .btn {
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.9rem;
      transition: all 0.2s ease;
    }

    .btn-primary {
      background: #fff;
      color: #667eea;
      font-weight: 600;
    }

    .btn-primary:hover {
      background: #f0f0f0;
    }

    .btn-secondary {
      background: rgba(255, 255, 255, 0.2);
      color: white;
    }

    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.3);
    }

    .btn-small {
      padding: 0.3rem 0.6rem;
      font-size: 0.8rem;
    }

    .btn-danger {
      background: #ff6b6b;
      color: white;
    }

    .btn-danger:hover {
      background: #ff5252;
    }

    .main-wrapper {
      display: flex;
      flex: 1;
      overflow: hidden;
      flex-direction: column;
    }

    .continuity-nav {
      background: white;
      border-bottom: 1px solid #e0e0e0;
      padding: 0.75rem 1.5rem;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    }

    .nav-empty {
      padding: 0.5rem 0;
      text-align: center;
      color: #999;
      font-size: 0.9rem;
    }

    .nav-container {
      max-width: 1600px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .nav-label {
      font-weight: 600;
      color: #555;
      white-space: nowrap;
      font-size: 0.95rem;
    }

    .nav-items {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
      flex: 1;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      background: #f9f9f9;
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s ease;
      font-size: 0.9rem;
      white-space: nowrap;
    }

    .nav-item:hover {
      background: #f0f0f0;
      border-color: #d0d0d0;
    }

    .nav-item.active {
      background: #667eea;
      color: white;
      border-color: #667eea;
    }

    .nav-item-color {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      display: inline-block;
    }

    .nav-item-name {
      font-weight: 500;
    }

    .nav-item-count {
      font-size: 0.8rem;
      opacity: 0.7;
      margin-left: 0.25rem;
    }

    .nav-add-btn {
      padding: 0.5rem 1rem;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
      font-size: 0.9rem;
      transition: all 0.2s ease;
      white-space: nowrap;
    }

    .nav-add-btn:hover {
      background: #5568d3;
    }

    .sidebar-empty,
    .content-empty,
    .editor-empty {
      padding: 2rem 1rem;
      text-align: center;
      color: #999;
    }

    .main-content {
      flex: 1;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .content-container {
      display: flex;
      gap: 1rem;
      padding: 1rem;
      overflow: hidden;
      flex: 1;
    }

    .timeline {
      flex: 1;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      overflow-y: auto;
      padding: 1.5rem;
    }

    .timeline-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      padding-bottom: 1rem;
      border-bottom: 2px solid #f0f0f0;
    }

    .timeline-header h2 {
      font-size: 1.5rem;
    }

    .timeline-header button {
      margin-left: 0.5rem;
    }

    .arcs-container {
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }

    .arc-section {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .arc-title {
      font-size: 1rem;
      color: #667eea;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .chapters-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
      gap: 1rem;
    }

    .chapter-item {
      background: #f9f9f9;
      border: 2px solid #e0e0e0;
      border-radius: 6px;
      padding: 1rem;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .chapter-item:hover {
      border-color: #667eea;
      background: #f0f0f0;
    }

    .chapter-item.selected {
      background: #667eea;
      color: white;
      border-color: #667eea;
    }

    .chapter-number {
      font-weight: 600;
      font-size: 1.2rem;
      margin-bottom: 0.5rem;
    }

    .chapter-title {
      font-size: 0.85rem;
      word-wrap: break-word;
    }

    .editor-panel {
      width: 350px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      overflow-y: auto;
      padding: 1.5rem;
    }

    .editor-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
      padding-bottom: 1rem;
      border-bottom: 2px solid #f0f0f0;
    }

    .editor-header h3 {
      font-size: 1.1rem;
    }

    .editor-form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .form-group label {
      font-weight: 600;
      font-size: 0.9rem;
      color: #555;
    }

    .form-group input,
    .form-group textarea {
      padding: 0.5rem;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-family: inherit;
      font-size: 0.9rem;
    }

    .form-group input:focus,
    .form-group textarea:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .content-textarea {
      min-height: 200px;
      resize: vertical;
    }

    .branch-view {
      flex: 1;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .branch-view-header {
      padding-bottom: 1rem;
      border-bottom: 2px solid #f0f0f0;
    }

    .branch-view-header h2 {
      font-size: 1.5rem;
    }

    .branch-canvas {
      width: 100%;
      height: 400px;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      background: white;
    }

    .welcome-screen {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 2rem;
    }

    .welcome-container {
      max-width: 700px;
      text-align: center;
    }

    .welcome-title {
      font-size: 4rem;
      color: white;
      margin-bottom: 3rem;
      font-weight: 700;
      letter-spacing: 2px;
    }

    .welcome-actions {
      display: flex;
      gap: 1.5rem;
      flex-direction: column;
      align-items: center;
    }

    .btn-large {
      padding: 0.75rem 2.5rem !important;
      font-size: 1rem !important;
      min-width: 280px;
    }

    .edit-sidebar {
      position: fixed;
      right: 0;
      top: 0;
      bottom: 0;
      width: 350px;
      background: white;
      box-shadow: -2px 0 8px rgba(0, 0, 0, 0.15);
      overflow-y: auto;
      z-index: 1000;
      display: flex;
      flex-direction: column;
    }

    .edit-sidebar.hidden {
      display: none;
    }

    .edit-sidebar-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem;
      border-bottom: 2px solid #f0f0f0;
      flex-shrink: 0;
    }

    .edit-sidebar-header h3 {
      font-size: 1.1rem;
      margin: 0;
    }

    .close-btn {
      background: none;
      border: none;
      font-size: 1.5rem;
      cursor: pointer;
      color: #666;
      padding: 0;
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .close-btn:hover {
      color: #333;
    }

    .edit-sidebar-content {
      flex: 1;
      padding: 1.5rem;
      overflow-y: auto;
    }

    .edit-sidebar .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }

    .edit-sidebar label {
      font-weight: 600;
      font-size: 0.9rem;
      color: #555;
    }

    .edit-sidebar input,
    .edit-sidebar textarea,
    .edit-sidebar select {
      padding: 0.5rem;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-family: inherit;
      font-size: 0.9rem;
    }

    .edit-sidebar input:focus,
    .edit-sidebar textarea:focus,
    .edit-sidebar select:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .edit-sidebar textarea {
      min-height: 100px;
      resize: vertical;
    }

    .edit-sidebar-actions {
      display: flex;
      gap: 0.5rem;
      padding: 1.5rem;
      border-top: 2px solid #f0f0f0;
      flex-shrink: 0;
    }

    .edit-sidebar-actions button {
      flex: 1;
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 600;
      font-size: 0.9rem;
      transition: all 0.2s ease;
    }

    .edit-sidebar-actions .btn-primary {
      background: #667eea;
      color: white;
    }

    .edit-sidebar-actions .btn-primary:hover {
      background: #5568d3;
    }

    .edit-sidebar-actions .btn-danger {
      background: #ff6b6b;
      color: white;
    }

    .edit-sidebar-actions .btn-danger:hover {
      background: #ff5252;
    }

    @media (max-width: 1200px) {
      .content-container {
        flex-direction: column;
      }

      .editor-panel {
        width: 100%;
        min-height: 300px;
      }

      .chapters-grid {
        grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
      }

      .nav-items {
        order: 2;
        flex-basis: 100%;
      }

      .nav-label {
        order: 1;
      }

      .nav-add-btn {
        order: 3;
        align-self: flex-start;
      }
    }

    @media (max-width: 720px) {
      #app {
        display: flex;
        flex-direction: column;
        height: 100vh;
      }

      #app.app-has-sidebar {
        padding-bottom: 25vh;
      }

      .main-wrapper {
        flex: 1;
        overflow: hidden;
        padding-bottom: 0;
      }

      .edit-sidebar {
        position: fixed;
        right: 0;
        bottom: 0;
        left: 0;
        top: auto;
        width: 100%;
        height: 25vh;
        min-height: 250px;
        border-top: 2px solid #e0e0e0;
        border-radius: 12px 12px 0 0;
        box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.15);
        z-index: 999;
      }

      .edit-sidebar-content {
        flex: 1;
        padding: 1rem;
        overflow-y: auto;
        overflow-x: hidden;
      }

      .edit-sidebar-header {
        padding: 1rem;
      }

      .edit-sidebar-header h3 {
        font-size: 1rem;
      }

      .edit-sidebar-actions {
        padding: 1rem;
        gap: 0.5rem;
      }

      .edit-sidebar-actions button {
        padding: 0.4rem 0.8rem;
        font-size: 0.85rem;
      }

      .edit-sidebar .form-group {
        margin-bottom: 0.75rem;
      }

      .edit-sidebar label {
        font-size: 0.85rem;
      }

      .edit-sidebar input,
      .edit-sidebar textarea,
      .edit-sidebar select {
        font-size: 0.85rem;
        padding: 0.4rem;
      }

      .edit-sidebar textarea {
        min-height: 60px;
      }
    }

    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2000;
    }

    .modal-content {
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      max-width: 450px;
      width: 90%;
      overflow: hidden;
    }

    .modal-header {
      padding: 1.5rem;
      border-bottom: 1px solid #e0e0e0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .modal-header h2 {
      margin: 0;
      font-size: 1.3rem;
      font-weight: 600;
    }

    .modal-body {
      padding: 1.5rem;
    }

    .modal-body p {
      margin: 0;
      color: #555;
      line-height: 1.6;
    }

    .modal-form {
      padding: 1.5rem;
    }

    .form-group {
      margin-bottom: 1.25rem;
    }

    .form-group:last-of-type {
      margin-bottom: 0;
    }

    .form-group label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 500;
      color: #333;
      font-size: 0.95rem;
    }

    .form-group input,
    .form-group textarea {
      width: 100%;
      padding: 0.65rem 0.85rem;
      border: 1px solid #d0d0d0;
      border-radius: 4px;
      font-family: inherit;
      font-size: 0.95rem;
      transition: border-color 0.2s ease;
    }

    .form-group input:focus,
    .form-group textarea:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .modal-actions {
      display: flex;
      gap: 1rem;
      justify-content: flex-end;
      padding: 1.5rem;
      border-top: 1px solid #e0e0e0;
    }

    .modal-actions button {
      padding: 0.5rem 1.2rem;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.2s ease;
    }

    .modal-actions .btn-primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .modal-actions .btn-primary:hover {
      opacity: 0.9;
      transform: translateY(-1px);
    }

    .modal-actions .btn-secondary {
      background: #f0f0f0;
      color: #333;
    }

    .modal-actions .btn-secondary:hover {
      background: #e0e0e0;
    }

    .textbox-overlay {
      z-index: 1;
    }

    .form-error {
      color: #ff6b6b;
      font-size: 0.85rem;
      margin-top: 0.25rem;
      display: block;
    }

    input.has-error {
      border-color: #ff6b6b !important;
      background-color: #fff5f5;
    }
  `;
  return style;
}
