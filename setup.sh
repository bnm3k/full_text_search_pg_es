#get data from project gutenberg
mkdir data
cd data 
curl -O http://www.gutenberg.org/cache/epub/feeds/rdf-files.tar.bz2
tar -xvjf rdf-files.tar.bz2
rm rdf-files.tar.bz2
cd ..

#convert rdf to ldj for insertion to elasticsearch
node src/scripts/rdf_to_bulk_ldj.js

#load ldj into elasticsearch
node src/scripts/load_to_es.js 
rm data/bulk_es.ldj

# read result from insertion
cat data/bulk_result.json | jq '.' | head -n 20

#list num and size of all docs
node src/search_es get _stats | \
jq '._all.primaries | { count: .docs.count, size: .store.size_in_bytes }'