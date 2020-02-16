const fs = require("fs");
const request = require("request");
const program = require("commander");
const path = require("path");
const { path: appRootPath } = require("app-root-path");

program
    .description("for loading bulk ldj into elasticsearch")
    .option("-o, --host <hostname>", "hostname [localhost]", "localhost")
    .option("-p, --port <number>", "port number [9200]", "9200");

program.parse(process.argv);

const createIndex = index =>
    new Promise((resolve, reject) => {
        request.put(
            `http://${program.host}:${program.port}/${index}/`,
            (err, res, body) => {
                if (err) reject(err);
                else resolve(body);
            }
        );
    });

const bulkInsert = ({ filepath, index, type, outStream }) =>
    new Promise((resolve, reject) => {
        fs.stat(filepath, (err, stats) => {
            if (err) throw err;
            let reqComplete = false;
            let resComplete = false;
            let onComplete = type => () => {
                if (type === "req") reqComplete = true;
                if (type === "res") resComplete = true;
                if (reqComplete && resComplete) resolve();
            };
            const opts = {
                url: `http://${program.host}:${program.port}/${index}/${type}/_bulk`,
                json: true,
                headers: {
                    "content-length": stats.size,
                    "content-type": "application/json"
                }
            };
            const req = request.post(opts);
            req.once("error", reject);
            outStream.once("error", reject);
            req.once("complete", onComplete("req"));
            req.once("close", onComplete("req"));
            outStream.once("close", onComplete("res"));

            fs.createReadStream(filepath).pipe(req);
            req.pipe(outStream);
        });
    });

const main = async () => {
    const index = "books";
    const type = "book";
    const filepath = path.resolve(appRootPath, "data/bulk_es.ldj");
    const outStream = fs.createWriteStream(
        path.resolve(appRootPath, "data/bulk_result.json")
    );
    //create index
    await createIndex(index);

    //bulk insert
    await bulkInsert({ index, type, filepath, outStream });

    console.log(
        "complete loading project gutenberg book details to elasticsearch"
    );
};

main().catch(err => {
    console.error(err);
});
