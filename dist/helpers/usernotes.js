"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateUsernotesToLatestSchema = exports.decompressBlob = exports.compressBlob = exports.expandPermalink = exports.squashPermalink = exports.EARLIEST_KNOWN_USERNOTES_SCHEMA = exports.LATEST_KNOWN_USERNOTES_SCHEMA = void 0;
const pako_1 = __importDefault(require("pako"));
/**
 * The latest usernotes schema version that this library can handle. If a
 * usernotes page reports a schema version higher than this number, it can't be
 * processed with this version of the library.
 */
exports.LATEST_KNOWN_USERNOTES_SCHEMA = 6;
/**
 * The earliest usernotes schema version that this library can handle. If a
 * usernotes page reports a schema version lower than this number, it can't be
 * processed with this version of the library.
 */
exports.EARLIEST_KNOWN_USERNOTES_SCHEMA = 4;
/**
 * Attempts to shorten a link into the Toolbox permalink format for usernotes.
 * This format is described here:
 * {@link https://github.com/toolbox-team/reddit-moderator-toolbox/wiki/Subreddit-Wikis%3A-usernotes#link-string-formats}
 * @param permalink The link to shorten
 * @returns A shortened link string, or the original URL if the link
 * doesn't match any shortening format known to Toolbox.
 */
function squashPermalink(permalink) {
    let match;
    if ((match = permalink.match(/(?:\/comments|^https?:\/\/redd\.it)\/([a-z0-9]+)(?:\/[^/]*(?:\/([a-z0-9]+)?)?)?/))) {
        // Submission pages
        let squashed = `l,${match[1]}`;
        if (match[2]) {
            // Add context for specific comments
            squashed += `,${match[2]}`;
        }
        return squashed;
    }
    else if ((match = permalink.match(/\/messages\/(\w+)/))) {
        // Old modmail pages
        return `m,${match[1]}`;
    }
    else if (permalink.startsWith('https://mod.reddit.com')) {
        // New modmail pages
        return permalink;
    }
    // If nothing else, return the original permalink
    return permalink;
}
exports.squashPermalink = squashPermalink;
/**
 * Expands a shortened link string from Toolbox usernotes into a full permalink.
 * This format is described here:
 * {@link https://github.com/toolbox-team/reddit-moderator-toolbox/wiki/Subreddit-Wikis%3A-usernotes#link-string-formats}
 * @param shortenedLink The shortened link string to expand
 * @returns The expanded, full permalink
 */
function expandPermalink(shortenedLink) {
    if (shortenedLink.startsWith('l,')) {
        // Expand to a submission or comment permalink
        return `https://www.reddit.com/comments/${shortenedLink.substr(2).split(',').join('/_/')}`;
    }
    else if (shortenedLink.startsWith('m,')) {
        // Expand to a message permalink
        return `https://www.reddit.com/message/messages/${shortenedLink.substr(2)}`;
    }
    return shortenedLink;
}
exports.expandPermalink = expandPermalink;
/**
 * Compresses a JSON value into a zlib-compressed, base64-encoded blob string.
 * This format is described here:
 * {@link https://github.com/toolbox-team/reddit-moderator-toolbox/wiki/Subreddit-Wikis:-usernotes#working-with-the-blob}
 * @param value The object or value to compress
 * @returns The generated blob.
 */
function compressBlob(value) {
    return Buffer.from(pako_1.default.deflate(JSON.stringify(value))).toString('base64');
}
exports.compressBlob = compressBlob;
/**
 * Decompresses a {@linkcode RawUsernotesBlob} string into the JSON value it
 * encodes. This format is described here:
 * {@link https://github.com/toolbox-team/reddit-moderator-toolbox/wiki/Subreddit-Wikis:-usernotes#working-with-the-blob}
 * @param blob The blob to decompress
 * @returns The original JSON value.
 */
function decompressBlob(blob) {
    return JSON.parse(pako_1.default.inflate(Buffer.from(blob, 'base64').toString('binary'), {
        to: 'string',
    }));
}
exports.decompressBlob = decompressBlob;
/**
 * Checks the schema version of raw usernotes data and attempts to update it to
 * the latest known schema version if it's out of date. Throws an error if the
 * data's current schema version is too old or new to handle.
 * @param data The usernotes data object read from the wiki, as an object (i.e.
 * you should parse the page contents as JSON to pass into this function)
 * @returns Data object updated to latest schema version
 */
function migrateUsernotesToLatestSchema(data) {
    if (data.ver < exports.EARLIEST_KNOWN_USERNOTES_SCHEMA) {
        throw new TypeError(`Unknown schema version ${data.ver} (earliest known version is ${exports.EARLIEST_KNOWN_USERNOTES_SCHEMA})`);
    }
    if (data.ver > exports.LATEST_KNOWN_USERNOTES_SCHEMA) {
        throw new TypeError(`Unknown schema version ${data.ver} (latest known version is ${exports.LATEST_KNOWN_USERNOTES_SCHEMA})`);
    }
    // eslint-disable-next-line default-case
    switch (data.ver) {
        case 4: // Migrate from 4 to 5
            // Timestamps need to be converted from milliseconds to seconds
            for (const user of Object.values(data.users)) {
                for (const note of user.ns) {
                    if (note.t) {
                        note.t /= 1000;
                    }
                }
            }
        // fallthrough to immediately bump to next version
        case 5: // Migrate from 5 to 6
            // Users are now stored as a blob rather than a plain object
            data.blob = compressBlob(data.users);
            delete data.users;
    }
    return data;
}
exports.migrateUsernotesToLatestSchema = migrateUsernotesToLatestSchema;
