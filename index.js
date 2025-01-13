import axios from 'axios';
import * as cheerio from 'cheerio';
import { createInterface } from 'readline';
import ncp from 'copy-paste';
import chalk from 'chalk';

// Color theme remains unchanged
const theme = {
    border: chalk.cyan,
    header: chalk.bold.yellow,
    title: chalk.white,
    size: chalk.green,
    index: chalk.cyan,
    prompt: chalk.bold.magenta,
    option: chalk.yellow,
    success: chalk.green,
    error: chalk.red,
    info: chalk.blue,
    pageNum: chalk.gray
};

const BASE_URL = 'https://audiobookbay.lu';

const rl = createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

// Table functions
function createTableRow(cols, widths) {
    return theme.border('│ ') + cols.map((col, i) => col.toString().padEnd(widths[i])).join(theme.border(' │ ')) + theme.border(' │');
}

function createTableSeparator(widths) {
    return theme.border('├─' + widths.map(w => '─'.repeat(w)).join('─┼─') + '─┤');
}

function displayResultsTable(results) {
    const widths = [3, 85, 10];
    const headers = ['#', 'Title', 'Size'];

    console.log(theme.border('┌─' + widths.map(w => '─'.repeat(w)).join('─┬─') + '─┐'));
    console.log(createTableRow(headers.map(h => theme.header(h)), widths));
    console.log(createTableSeparator(widths));

    results.forEach((book, index) => {
        const row = [
            theme.index(index + 1),
            theme.title(book.title),
            theme.size(book.size)
        ];
        console.log(createTableRow(row, widths));
    });

    console.log(theme.border('└─' + widths.map(w => '─'.repeat(w)).join('─┴─') + '─┘'));
}

function createMagnetUrl(hash, title) {
    if (!hash) return null;
    const encodedTitle = encodeURIComponent(title);
    const trackers = [
        'http://share.camoe.cn:8080/announce',
        'udp://tracker.torrent.eu.org:451/announce',
        'http://t.nyaatracker.com:80/announce',
        'udp://tracker.doko.moe:6969/announce',
        'http://asnet.pw:2710/announce',
        'udp://thetracker.org:80/announce',
        'http://tracker.tfile.co:80/announce',
        'http://pt.lax.mx:80/announce',
        'udp://santost12.xyz:6969/announce',
        'https://tracker.bt-hash.com:443/announce',
        'udp://bt.xxx-tracker.com:2710/announce',
        'udp://tracker.vanitycore.co:6969/announce',
        'udp://zephir.monocul.us:6969/announce',
        'http://grifon.info:80/announce',
        'http://retracker.spark-rostov.ru:80/announce',
        'http://tr.kxmp.cf:80/announce',
        'http://tracker.city9x.com:2710/announce',
        'udp://bt.aoeex.com:8000/announce',
        'http://tracker.files.fm:6969/announce',
        'http://tracker.bt4g.com:2095/announce',
        'http://tracker2.dler.org:80/announce',
        'udp://exodus.desync.com:6969/announce',
        'udp://open.stealth.si:80/announce',
        'udp://bt1.archive.org:6969/announce',
        'udp://tracker.dler.org:6969/announce',
        'udp://tracker.opentrackr.org:1337/announce',
        'udp://tracker.tiny-vps.com:6969/announce'
    ].map(tracker => `&tr=${encodeURIComponent(tracker)}`).join('');

    return `magnet:?xt=urn:btih:${hash}&dn=${encodedTitle}${trackers}`;
}

async function searchAudiobooks(query, page = 1) {
    try {
        const searchTerms = query.match(/"[^"]+"|[^"\s]+/g) || [];
        const processedTerms = searchTerms.map(term =>
            term.startsWith('"') ? term : `"${term}"`
        ).join(' ');

        const searchUrl = `${BASE_URL}/page/${page}/?s=${encodeURIComponent(processedTerms)}&cat=undefined%2Cundefined`;
        console.log(`\nSearching URL: ${searchUrl}\n`);

        const response = await axios.get(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
            }
        });

        const $ = cheerio.load(response.data);
        const results = [];

        $('#content .post, #content article.post').each((i, element) => {
            const $post = $(element);
            const titleElement = $post.find('.postTitle h2 a');
            const title = titleElement.text().trim();
            const url = titleElement.attr('href');
            const postContent = $post.find('.postContent').text();

            const details = {
                size: (postContent.match(/Size:\s*([^\n]+)/) || [])[1]
            };

            if (title && url) {
                const fullUrl = url.startsWith('http') ? url : `${BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
                results.push({
                    title,
                    url: fullUrl,
                    size: details.size?.trim() || 'Unknown'
                });
            }
        });

        const hasNextPage = $('#pagination a:contains("»")').length > 0;
        return { results, hasNextPage };
    } catch (error) {
        console.error('Search error:', error.message);
        return { results: [], hasNextPage: false };
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
        let magnetHash = '';

        const magnetElement = $('#magnetLink');
        if (magnetElement.length > 0) {
            magnetHash = magnetElement.text().trim();
        }

        if (!magnetHash) {
            $('*').each((_, el) => {
                const text = $(el).text().trim();
                if (text.match(/^[a-fA-F0-9]{40}$/)) {
                    magnetHash = text;
                    return false;
                }
            });
        }

        return {
            title,
            magnetUrl: magnetHash ? createMagnetUrl(magnetHash, title) : null
        };
    } catch (error) {
        console.error('Details error:', error.message);
        return null;
    }
}

async function displayOptions(results, hasNextPage, currentPage) {
    const options = [
        theme.option('0. Exit'),
        theme.option('1-N. Select audiobook')
    ];
    if (hasNextPage) options.push(theme.option('n. Next page'));
    if (currentPage > 1) options.push(theme.option('p. Previous page'));

    console.log('\nOptions:', options.join(', '));
    return await question(theme.prompt('\nEnter your choice: '));
}

async function handleBookSelection(results, selectedIndex) {
    const selectedBook = results[selectedIndex];
    console.log('\nFetching audiobook details...\n');

    const bookDetails = await getAudiobookDetails(selectedBook.url);
    if (!bookDetails || !bookDetails.magnetUrl) {
        console.log('No magnet link available for this audiobook.');
        return;
    }

    console.log(theme.info('\nMagnet Link for:'), theme.title(bookDetails.title));
    console.log(theme.border('─'.repeat(50)));
    console.log(theme.info(bookDetails.magnetUrl));

    console.log(theme.info('\nPlease select and copy the magnet link above manually.'));
}

async function main() {
    try {
        let currentPage = 1;
        let keepSearching = true;
        let query = await question(theme.prompt('Enter search term: '));

        while (keepSearching) {
            console.log(theme.info('\nSearching for audiobooks...\n'));
            const { results, hasNextPage } = await searchAudiobooks(query, currentPage);

            if (results.length === 0) {
                console.log('No results found.');
                const retry = await question(theme.prompt('\nWould you like to search again? (y/n): '));
                if (retry.toLowerCase() === 'y') {
                    // Reset page number and get new search term
                    currentPage = 1;
                    query = await question(theme.prompt('Enter search term: '));
                    continue; // Continue the main loop with new search term
                } else {
                    break; // Exit the loop and end script if user doesn't want to search again
                }
            }

            console.log(theme.info(`\nPage ${currentPage}`));
            displayResultsTable(results);

            let continueSession = true;
            while (continueSession) {
                const choice = await displayOptions(results, hasNextPage, currentPage);

                if (choice.toLowerCase() === 'n' && hasNextPage) {
                    currentPage++;
                    continueSession = false;  // Break inner loop to refresh results
                    continue;
                } else if (choice.toLowerCase() === 'p' && currentPage > 1) {
                    currentPage--;
                    continueSession = false;  // Break inner loop to refresh results
                    continue;
                } else if (choice === '0') {
                    keepSearching = false;
                    break;
                }

                const choiceNum = parseInt(choice);
                if (isNaN(choiceNum) || choiceNum < 1 || choiceNum > results.length) {
                    console.log('Invalid choice. Please try again.');
                    continue;
                }

                await handleBookSelection(results, choiceNum - 1);

                console.log('\nOptions:');
                console.log(theme.option('1. Choose another book from the list'));
                console.log(theme.option('2. Search again with a different term'));
                console.log(theme.option('3. Exit'));
                
                const continueChoice = await question(theme.prompt('\nEnter your choice (1-3): '));
                
                switch(continueChoice) {
                    case '1':
                        // Re-display the table and continue the loop
                        console.log('\n');
                        displayResultsTable(results);
                        break;
                    case '2':
                        // Reset page and get new search term
                        currentPage = 1;
                        query = await question(theme.prompt('Enter new search term: '));
                        continueSession = false;
                        break;
                    case '3':
                        keepSearching = false;
                        break;
                    default:
                        console.log(theme.error('Invalid choice. Please try again.'));
                        // Re-display the table and continue the loop
                        console.log('\n');
                        displayResultsTable(results);
                }
            }
        }
    } catch (error) {
        console.error('An error occurred:', error.message);
    } finally {
        rl.close();
    }
}

main();
