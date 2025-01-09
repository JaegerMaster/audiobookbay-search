# Audiobookbay Search CLI

A command-line interface tool for searching audiobookbay and retrieving magnet links. This tool allows you to search for audiobooks using exact phrase matching and easily obtain magnet links for downloading.

## Features

- **Exact Phrase Search**: Search terms are automatically wrapped in quotes for precise matching
- **Detailed Information Display**: Shows comprehensive information for each audiobook including:
  - Title
  - Language
  - Category
  - Format
  - File size
  - Author
  - Narrator
  - Bitrate
- **Magnet Link Generation**: Automatically generates magnet links with optimal trackers
- **User-Friendly Interface**: Simple command-line interface with numbered results
- **Error Handling**: Robust error handling for network issues and invalid responses

## Prerequisites

Before you begin, ensure you have:
- Node.js (version 16 or higher)
- npm (Node Package Manager)
- Git (for cloning the repository)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/JaegerMaster/audiobookbay-search
cd audiobookbay-search
```

2. Install dependencies:
```bash
npm install
```

## Usage

1. Start the application:
```bash
npm start
# or
node index.js
```

2. When prompted, enter your search term:
```
Enter search term: Harry Potter
```

3. The tool will display a numbered list of results with details:
```
1. Harry Potter and the Philosopher's Stone
   Language: English
   Category: Children
   Format: MP3
   Size: 264 MB

2. Harry Potter and the Chamber of Secrets
   ...
```

4. Enter the number of your chosen audiobook to get its magnet link:
```
Enter the number of the audiobook you want (or 0 to exit):
```

5. The tool will display detailed information and the magnet link:
```
Audiobook Details:
-------------------
Title: Harry Potter and the Philosopher's Stone
Author: J.K. Rowling
Narrator: Stephen Fry
Format: MP3
Bitrate: 128 kbps

Magnet Link:
magnet:?xt=urn:btih:...
```

## Technical Details

### Directory Structure
```
audiobookbay-search/
├── index.js          # Main application file
├── package.json      # Project configuration and dependencies
├── README.md         # Documentation
├── LICENSE           # MIT License
└── .gitignore       # Git ignore configuration
```

### Dependencies

- **axios**: HTTP client for making requests to the audiobookbay website
- **cheerio**: HTML parser for extracting information from web pages
- **readline**: Built-in Node.js module for command-line interface

### Search Implementation

The tool performs searches by:
1. Converting search terms to lowercase
2. Wrapping terms in quotes for exact matching
3. Using the format: `https://audiobookbay.lu/?s="search term"&cat=undefined%2Cundefined`
4. Parsing the HTML response using cheerio
5. Extracting relevant information using CSS selectors and regex

### Magnet Link Generation

Magnet links are generated with:
- Hash extracted from the audiobook page
- Encoded title as the display name
- Multiple trackers for optimal downloading

## Error Handling

The tool includes error handling for:
- Network connection issues
- Invalid search results
- Missing magnet links
- Malformed webpage responses

## Contributing

Feel free to submit issues and enhancement requests!

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Disclaimer

This tool is for educational purposes only. Please respect copyright laws and use it responsibly.
