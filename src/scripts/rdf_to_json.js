"use strict";
const { path: appRootPath } = require("app-root-path");
const { parseRDF } = require("../utils/parseRDF");
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
