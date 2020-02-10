const cheerio = require("cheerio");

const parseRDF = rdf => {
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
};

module.exports = { parseRDF };
