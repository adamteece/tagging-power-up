# Project Specification: Tagging Power-Up Firefox Extension

## 1. Introduction & Overview

### 1.1 Product Name
Tagging Power-Up

### 1.2 Purpose
To significantly improve and streamline the process of tagging web pages and features for analytics platforms (initially focusing on Pendo), particularly for modern web applications utilizing Shadow DOM, and to assist in generating accurate Page Rules.

### 1.3 Problem Statement
Manually tagging elements for analytics platforms like Pendo can be time-consuming and error-prone, especially when dealing with elements encapsulated within Shadow DOM. Generating correct Page Rules from URLs also requires manual effort and understanding of specific syntax, leading to potential inconsistencies. Existing tools offer some assistance but may lack comprehensive Shadow DOM support, automated Page Rule generation, or robust selector validation.

### 1.4 Goal
This extension aims to reduce the time and complexity involved in analytics tagging, increase the accuracy of tags and page rules, and empower users to effectively leverage analytics even on complex web applications.

### 1.5 Target Audience
Product Managers, UX Designers, Frontend Developers, QA Engineers, and anyone responsible for setting up or maintaining analytics configurations.

## 2. Features & Functionality

### 2.1 Enhanced Element Inspector (with Shadow DOM Support & Match Count)

*   **Description:** An interactive tool that allows users to select any element on the page, including those within open Shadow DOM trees. It generates a robust CSS selector for the selected element and provides a count of how many elements on the page match that selector.
*   **Requirements:**
    *   **Activation:** Activated via a button in the extension popup or a context menu option on the webpage.
    *   **Visual Highlighting:** When activated, hovering over elements on the page should visually highlight them.
    *   **Element Selection:**
        *   Clicking an element on the page should select it.
        *   Must be able to "pierce" through and select elements encapsulated within *open* Shadow DOM boundaries.
        *   Should identify the deepest possible element under the cursor.
    *   **CSS Selector Generation:**
        *   Generate a stable, unique, and Pendo-compatible CSS selector for the selected element.
        *   Prioritize selectors based on: `id` (if unique), unique `class` names, `data-` attributes, or a combination including tag names and `nth-child` if necessary.
    *   **Selector Display & Copy:**
        *   Display the generated selector clearly within the extension popup.
        *   Provide a one-click button to copy the selector to the clipboard.
        *   Allow the user to manually edit the generated selector.
    *   **Selector Match Count Verification:**
        *   A "Count Matches" or "Validate Selector" button visible next to the displayed selector.
        *   Upon clicking, the extension should query the current page's DOM (including all accessible Shadow DOMs) using the provided CSS selector.
        *   Display the total number of elements found that match the selector (e.g., "Matches: 1 element", "Matches: 5 elements").
        *   **Crucial for Shadow DOM:** If a selector is intended to target an element within a Shadow DOM, the counting mechanism must correctly traverse into the shadow root(s) to find matches. This might require custom traversal logic if standard `document.querySelectorAll()` doesn't fully support deep selectors across shadow boundaries.

### 2.2 Pendo Page Rule Generator

*   **Description:** A tool that analyzes the current browser URL and suggests Pendo-compatible Page Rules.
*   **Requirements:**
    *   Automatically read the current page's full URL.
    *   Parse the URL into its components: protocol, domain, path, query parameters, hash.
    *   Based on common Pendo Page Rule syntax, generate several rule suggestions, including:
        *   Exact match for the full URL.
        *   Match based on protocol, domain, and path (ignoring query parameters and hash).
        *   "Starts with" rule based on protocol and domain.
        *   Suggestions incorporating wildcards (`*`).
        *   Suggestions for specific query parameter handling (e.g., `?param=value`, `?param=*`).
    *   Display the generated rule suggestions clearly within the popup.
    *   Provide a one-click button to copy each suggested rule to the clipboard.
    *   (Optional but desirable) Provide brief explanations or links to relevant Pendo documentation for each rule type.

### 2.3 General Extension UI/UX

*   **Accessibility:** Accessible via a Firefox toolbar icon.
*   **Interface:** A clean, intuitive popup interface with clear separation of features (e.g., using tabs for "Element Inspector" and "Page Rules").
*   **Help:** Include a basic "Help" or "About" section with links to support or relevant Pendo documentation.

## 3. Technical Considerations

### 3.1 WebExtension API Namespace
*   Use the `browser.*` namespace for WebExtension APIs (e.g., `browser.tabs.query`, `browser.runtime.sendMessage`). This allows for easier future porting to Chrome using the `webextension-polyfill`.

### 3.2 Manifest Version
*   **Initial Development:** Firefox Manifest V2.
*   **Future Chrome Compatibility:** Needs to be adaptable to Chrome Manifest V3 (requires changes to `manifest.json`, `background` script to `service_worker`, and `tabs.executeScript` to `chrome.scripting.executeScript`). The code should be structured to make this transition manageable.

### 3.3 Shadow DOM Traversal & Selector Generation
*   Leverage `element.shadowRoot` property to access open shadow roots.
*   Implement recursive traversal for deeply nested Shadow DOMs.
*   The CSS selector generation algorithm needs to be robust and identify elements within shadow roots reliably. This is a core challenge.

### 3.4 Content Script Communication
*   The popup script (`popup.js`) will communicate with the content script (`inspector.js`) injected into the active tab using `browser.tabs.sendMessage` and `browser.runtime.onMessage` listeners.
*   The content script will perform DOM manipulation, element selection, and selector generation, sending results back to the popup.

### 3.5 Selector Validation (`querySelectorAll` for Match Count)
*   For the match count, use `document.querySelectorAll(selector)` within the content script.
*   For selectors that pierce Shadow DOMs, a custom implementation might be needed to traverse shadow boundaries and apply sub-selectors within each shadow root, as native `querySelectorAll` does not universally support deep selectors (like `>>>` or `/deep/`).

## 4. Project Structure

The project will follow a standard WebExtension file structure:

*   `/manifest.json`: The main manifest file defining the extension's properties, permissions, and entry points.
*   `/popup/`: Contains files related to the extension's popup UI.
    *   `popup.html`: The HTML structure for the extension's popup.
    *   `popup.css`: Stylesheet for `popup.html`.
    *   `popup.js`: JavaScript logic for the popup, handling UI interactions, sending requests to content scripts, and displaying results.
*   `/content_scripts/`: Contains JavaScript files injected into the active tab's context.
    *   `inspector.js`: Core logic for element inspection, Shadow DOM traversal, CSS selector generation, and match counting. This script interacts directly with the webpage's DOM.
*   `/icons/`: Directory for extension icons (e.g., 16x16, 32x32, 48x48, 128x128).
*   `/utils/`: (Optional) A directory for shared utility functions that might be used by both the popup and content scripts (e.g., a complex URL parsing helper, or a base selector generation logic).

## 5. Non-Functional Requirements

*   **Performance:** The extension must not significantly degrade browser performance or page load times. DOM inspection should be efficient.
*   **Security:** The extension should request minimal permissions necessary for its functionality. It must not collect or transmit any user data unnecessarily. Adhere to WebExtension security best practices.
*   **Reliability:** The extension should work consistently across a wide range of websites and complex modern web applications (including those with heavy Shadow DOM usage).
*   **Usability:** Easy to learn and use, even for users less familiar with browser developer tools.
*   **Maintainability:** Code should be well-structured, modular, and commented to allow for future updates and bug fixes.
*   **Compatibility:** Must be compatible with the latest stable version of Firefox.

## 6. Future Considerations / Out of Scope (for V1)

*   Direct integration with Pendo API (e.g., pushing tags directly to Pendo).
*   Support for *closed* Shadow DOM (by design, these are not directly accessible).
*   Advanced feature rule generation beyond simple element selectors (unless Pendo has clearly documented patterns).
*   Saving or managing generated rules within the extension itself.
*   Support for other browsers (e.g., Chrome) initially; focus on Firefox first.
*   Visual rule builder for Page Rules (beyond simple suggestions).

## 7. Open Questions / Research Needed

*   What is the exact Pendo syntax and best practice for CSS selectors targeting elements within Shadow DOM? (This is critical for selector generation and validation accuracy).
*   How does Pendo's own tagger or existing helper extensions handle (or fail to handle) Shadow DOM and selector validation?
*   What are the most common Pendo Page Rule patterns users create?
*   Are there specific edge cases in URL structures that Pendo's Page Rule syntax handles uniquely?
*   Identify official Pendo documentation pages for Page Rule syntax and Feature Tagging best practices.