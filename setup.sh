mkdir data
cd data 
curl -O http://www.gutenberg.org/cache/epub/feeds/rdf-files.tar.bz2
tar -xvjf rdf-files.tar.bz2
cd ..
node src/scripts/rdf_to_bulk_ldj.js