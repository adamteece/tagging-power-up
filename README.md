# Tagging Power-Up

A Firefox extension designed to streamline analytics tagging and page rule generation for Pendo, with comprehensive Shadow DOM support.

## Overview

Tagging Power-Up significantly improves and streamlines the process of tagging web pages and features for analytics platforms (initially focusing on Pendo), particularly for modern web applications utilizing Shadow DOM. The extension also assists in generating accurate Page Rules.

## Problem Statement

Manually tagging elements for analytics platforms like Pendo can be time-consuming and error-prone, especially when dealing with elements encapsulated within Shadow DOM. Generating correct Page Rules from URLs also requires manual effort and understanding of specific syntax, leading to potential inconsistencies. Existing tools offer some assistance but may lack comprehensive Shadow DOM support, automated Page Rule generation, or robust selector validation.

## Target Audience

- Product Managers
- UX Designers
- Frontend Developers
- QA Engineers
- Anyone responsible for setting up or maintaining analytics configurations

## Key Features

### 1. Enhanced Element Inspector with Shadow DOM Support

- **Interactive Element Selection**: Click any element on the page, including those within open Shadow DOM trees
- **Visual Highlighting**: Hover over elements to see them highlighted before selection
- **Smart CSS Selector Generation**: Automatically generates stable, unique, and Pendo-compatible CSS selectors
- **Selector Validation**: Count how many elements match your selector across the entire page, including Shadow DOM
- **Copy to Clipboard**: One-click copying of generated selectors

### 2. Pendo Page Rule Generator

- **Automatic URL Analysis**: Reads and parses the current page's URL
- **Multiple Rule Suggestions**: Generates various Pendo-compatible Page Rules including:
  - Exact URL matches
  - Protocol, domain, and path matching (ignoring query parameters)
  - "Starts with" rules
  - Wildcard patterns
  - Query parameter handling
- **One-Click Copy**: Easy copying of generated rules to clipboard

### 3. User-Friendly Interface

- **Clean Popup Interface**: Accessible via Firefox toolbar icon
- **Tabbed Navigation**: Clear separation between Element Inspector and Page Rules features
- **Help Section**: Built-in help and links to relevant documentation

## Installation

1. Download or clone this repository
2. Open Firefox and navigate to `about:debugging`
3. Click "This Firefox" in the sidebar
4. Click "Load Temporary Add-on"
5. Select the `manifest.json` file from the extension directory

## Usage

### Element Inspector

1. Click the Tagging Power-Up icon in your Firefox toolbar
2. Navigate to the "Element Inspector" tab
3. Click "Activate Inspector"
4. Hover over elements on the page to highlight them
5. Click an element to select it and generate CSS selectors
6. Use "Count Matches" to validate your selector
7. Copy the selector to clipboard for use in Pendo

### Page Rules

1. Navigate to the page you want to create rules for
2. Open the Tagging Power-Up extension
3. Go to the "Page Rules" tab
4. Review the automatically generated rule suggestions
5. Copy the appropriate rule to clipboard for use in Pendo

## Technical Details

- **Browser Compatibility**: Firefox (Manifest V2)
- **Shadow DOM Support**: Full support for open Shadow DOM traversal
- **Permissions**: Minimal permissions required (activeTab, tabs)
- **Performance**: Designed to not impact browser or page performance

## Development

The extension follows standard WebExtension architecture:

- `/manifest.json` - Extension manifest
- `/popup/` - Extension popup UI files
- `/content_scripts/` - Content scripts for DOM interaction
- `/icons/` - Extension icons
- `/utils/` - Shared utility functions

## Contributing

This project aims to reduce the time and complexity involved in analytics tagging, increase the accuracy of tags and page rules, and empower users to effectively leverage analytics even on complex web applications.

For detailed technical specifications, see [spec.md](spec.md).

## Future Enhancements

- Chrome compatibility (Manifest V3)
- Direct Pendo API integration
- Advanced Page Rule patterns
- Visual rule builder interface

## License

[License information to be added]