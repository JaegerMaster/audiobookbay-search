import axios from 'axios';
import * as cheerio from 'cheerio';
import { createInterface } from 'readline';

const BASE_URL = 'https://audiobookbay.lu';

// Create readline interface for user input
const rl = createInterface({
    input: process.stdin,
    output: process.stdout
});

// Promise wrapper for readline question
const question = (query) => new Promise((resolve) => rl.question(query, resolve));

// Function to convert hash to magnet URL
function createMagnetUrl(hash, title) {
    if (!hash) return null;
    console.log('Creating magnet URL for hash:', hash);
    const encodedTitle = encodeURIComponent(title);
    const trackers = [
        'udp://tracker.coppersurfer.tk:6969/announce',
        'udp://tracker.openbittorrent.com:6969/announce',
        'udp://tracker.opentrackr.org:1337/announce',
        'udp://exodus.desync.com:6969/announce',
        'udp://tracker.torrent.eu.org:451/announce'
    ].map(tracker => `&tr=${encodeURIComponent(tracker)}`).join('');
    
    return `magnet:?xt=urn:btih:${hash}&dn=${encodedTitle}${trackers}`;
}

async function searchAudiobooks(query) {
    try {
        // Format the search URL exactly as specified
        const searchUrl = `${BASE_URL}/?s=${encodeURIComponent(query.toLowerCase())}&cat=undefined%2Cundefined`;
        console.log(`Searching URL: ${searchUrl}`);
        
        const response = await axios.get(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5'
            }
        });

        const $ = cheerio.load(response.data);
        const results = [];
        
        // Check if we're on a search results page
        const searchTitle = $('h1:contains("Search Results")').length > 0;
        console.log('Is search results page:', searchTitle);
        
        // Using the content div as main container
        $('#content .post, #content article.post').each((i, element) => {
            const $post = $(element);
            const titleElement = $post.find('.postTitle h2 a');
            const title = titleElement.text().trim();
            const url = titleElement.attr('href');
            const postContent = $post.find('.postContent').text();
            
            // Extract info using regex
            const details = {
                language: (postContent.match(/Language:\s*([^\n]+)/) || [])[1],
                category: (postContent.match(/Category:\s*([^\n]+)/) || [])[1],
                format: (postContent.match(/Format:\s*([^\n]+)/) || [])[1],
                size: (postContent.match(/Size:\s*([^\n]+)/) || [])[1]
            };

            if (title && url) {
                // Ensure URL is complete
                const fullUrl = url.startsWith('http') ? url : `${BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
                results.push({
                    title,
                    url: fullUrl,
                    language: details.language?.trim() || 'Unknown',
                    category: details.category?.trim() || 'Unknown',
                    format: details.format?.trim() || 'Unknown',
                    size: details.size?.trim() || 'Unknown'
                });
            }
        });

        return results;
    } catch (error) {
        console.error('Search error:', error.message);
        return [];
    }
}

async function getAudiobookDetails(url) {
    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        
        const $ = cheerio.load(response.data);
        const title = $('.postTitle h1').text().trim();
        const postContent = $('.postContent').text();
        
        console.log('Debug: Checking magnet hash element');
        const magnetElement = $('#magnetLink');
        console.log('Magnet element found:', magnetElement.length > 0);
        let magnetHash = magnetElement.length > 0 ? magnetElement.text().trim() : '';
        
        // If we couldn't find the hash in the magnetLink element, try alternative methods
        if (!magnetHash) {
            // Look for any element containing text that looks like a hash
            $('*').each((_, el) => {
                const text = $(el).text().trim();
                if (text.match(/^[a-fA-F0-9]{40}$/)) {
                    magnetHash = text;
                    return false; // Break the loop
                }
            });
        }
        console.log('Magnet hash:', magnetHash);
        
        // Extract book details
        const details = {
            author: (postContent.match(/Author:\s*([^\n]+)/) || [])[1],
            narrator: (postContent.match(/Read by:\s*([^\n]+)/) || [])[1],
            format: (postContent.match(/Format:\s*([^\n]+)/) || [])[1],
            bitrate: (postContent.match(/Bitrate:\s*([^\n]+)/) || [])[1]
        };

        return {
            title: title || 'Unknown Title',
            author: details.author?.trim() || 'Unknown',
            narrator: details.narrator?.trim() || 'Unknown',
            format: details.format?.trim() || 'Unknown',
            bitrate: details.bitrate?.trim() || 'Unknown',
            magnetUrl: magnetHash ? createMagnetUrl(magnetHash, title) : null
        };
    } catch (error) {
        console.error('Details error:', error.message);
        return null;
    }
}

async function main() {
    try {
        const query = await question('Enter search term: ');
        console.log('\nSearching for audiobooks...\n');
        
        const results = await searchAudiobooks(query);
        
        if (results.length === 0) {
            console.log('No results found. Please try a different search term.');
            return;
        }
        
        // Display results
        results.forEach((book, index) => {
            console.log(`${index + 1}. ${book.title}`);
            console.log(`   Language: ${book.language}`);
            console.log(`   Category: ${book.category}`);
            console.log(`   Format: ${book.format}`);
            console.log(`   Size: ${book.size}`);
            console.log('');
        });
        
        const choice = await question('Enter the number of the audiobook you want (or 0 to exit): ');
        const choiceNum = parseInt(choice);
        
        if (choiceNum === 0 || isNaN(choiceNum) || choiceNum > results.length) {
            console.log('Exiting...');
            return;
        }
        
        const selectedBook = results[choiceNum - 1];
        console.log('\nFetching audiobook details...\n');
        
        const bookDetails = await getAudiobookDetails(selectedBook.url);
        
        if (!bookDetails) {
            console.log('Unable to fetch audiobook details. Please try again later.');
            return;
        }
        
        // Display results
        console.log('\nAudiobook Details:');
        console.log('-------------------');
        console.log('Title:', bookDetails.title);
        console.log('Author:', bookDetails.author);
        console.log('Narrator:', bookDetails.narrator);
        console.log('Format:', bookDetails.format);
        console.log('Bitrate:', bookDetails.bitrate);
        
        if (bookDetails.magnetUrl) {
            console.log('\nMagnet Link:');
            console.log(bookDetails.magnetUrl);
        } else {
            console.log('\nNo magnet link available for this audiobook.');
        }
        
    } catch (error) {
        console.error('An error occurred:', error.message);
    } finally {
        rl.close();
    }
}

main();
