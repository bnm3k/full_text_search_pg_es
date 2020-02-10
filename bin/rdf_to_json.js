"use strict";
const cheerio = require("cheerio");
const { path: appRootPath } = require("app-root-path");
const path = require("path");
const fs = require("fs");

try {
    const rdfID = checkRDFArg(Number(process.argv[2]));
    const rdfPath = getRDFPath(rdfID);
    const rdf = fs.readFileSync(rdfPath);
    const book = parseRDF(rdf);
    console.log(JSON.stringify(book, null, 4));
} catch (error) {
    console.log(`invalid rdf ID arg: ${process.argv[2]}`);
    process.exit(1);
}

function checkRDFArg(rdfID) {
    if (!Number.isInteger(rdfID) || rdfID < 1 || rdfID > 999999) {
        console.error(`invalid rdf ID arg: ${process.argv[2]}`);
        process.exit(1);
    }
    return rdfID;
}

function getRDFPath(rdfID) {
    return path.join(appRootPath, `data/cache/epub/${rdfID}/pg${rdfID}.rdf`);
}

function parseRDF(rdf) {
    const $ = cheerio.load(rdf);

    const book = {};

    book.id = +$("pgterms\\:ebook")
        .attr("rdf:about")
        .replace("ebooks/", "");
    book.title = $("dcterms\\:title").text();
    book.authors = $("pgterms\\:agent pgterms\\:name")
        .toArray()
        .map(elem => $(elem).text());
    book.subjects = $('[rdf\\:resource$="/LCSH"]')
        .parent()
        .find("rdf\\:value")
        .toArray()
        .map(elem => $(elem).text());
    // book.download_links = $("pgterms\\:file")
    //     .toArray()
    //     .map(function(elem, i) {
    //         const format = $(elem)
    //             .find("rdf\\:value")
    //             .text();
    //         const url = $(elem).attr("rdf:about");
    //         return { format, url };
    //     });

    return book;
}
