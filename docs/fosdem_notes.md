# FOSDEM

 Information retrieval -> Text retrieval -> document retri

* FTS, search of words(tokens) in a database

* Indexing, avoid scanning through whole documents. Techniques based on Natural Language Processing

* Precision (how accurate the search result is) ie measure of false positives and false negatives. Recall: number of results returned ie how restrictive or permissive is the search. Both affected by stemming and stop-words

* Parsing documents: breaking them up into tokens. Conversion of tokens into lexemes. A more usable form

* A lexeme: a word-root. The root of a word

* Filtering out stop words increases the precision of the results

* `tsvector` a preprocessed document, 

* `tsquery`: search query normalized into lexems

* `plainto_tsquery`: ignores punctuation, capitalization etc

* `<->`: for defining word order, tsquery1 followed by tsquery2

* Proper names

* `websearch_to_tsquery`:  google-style searches

* ts_rank: scaling number,

* `ts_stat`: verifying the text-search, check which is the most common word etc: 
  
  ```sql
  select * from ts_stat(
      select to_tsvector(body_plain)
      from mail_messages
  ) 
  order by nentry DESC, ndoc DESC, word
  limit 10;
  ```

* BTree not suitable for full-text search, A quick trick I learnt from Jimmy Angelakos Full-Text search talk: right anchored text search using indexes, simply reverse the text. Using trigram to speed up searches too - another trick from Angelakos's talk us using ...

* GIN index: each lexeme has one entry. Best for less dynamic data

* GiST: lossy, smaller, slower, Better on fewer unique items

* Postgres 12, generated collumns. 

* fuzzystrmatch: warning when using with utf8

* VODKA index type

* RUM: well maintained, can perform faster ranking and faster phrase search. Lexeme positional information stored.

* Free text but not natural: use trigram.

* JSON jsonb_to_tsvector, JsQuery language

* VACUUM ANALYZE, ALTER TABLE SET STATISTICS: keep your table statistics up to date
