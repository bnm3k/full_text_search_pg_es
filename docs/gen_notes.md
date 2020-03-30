## POSTGRES FULL-TEXT SEARCH

Multi-word/phrase search

Operators

unaccent, language, setweight

Query parser

### 7 DBs

* How to write a simple search query on the JSON with no ranking

* How to add a simple index  on the search field and ensure it's being used

Features for search

* Dictionary used

* Stemming: "reducing inflected/derived words to their stem/base/root" - paraphrased from wikipedia

* Ranking: "a measure of how releavant documents are to a particular query"

* Multi-language support

* Fuzzy search for misspelling

* Accent support

### Quick background, full-text search

When combing through text, the most basic kind of search is an exact-match [add example]

Given its limitations, the SQL standard also includes ...

Lastly, there's good old-fashioned regex pattern matching

Still, all these have their limitations, given the different kinds of searches in mind

One of the great thing about PostgreSQL is its extensibility. There are additional modules that can can be incorporated so that we can do all kinds of search, but to cut straight to the chase, full-text search.

In order to set up full-text search in Postgres, we require a dictionary and of course, the actual textual data on which the search will be carried out on. A dictionary groups together words with similar meanings/connotations, organizes the stems of the language, ie the linguistic root/base of words. It also includes a *stop-list* ie a list of 'filler' words/ stop words and phrases that are used in spoken/written language to make sentences complete and grammatical but can be filtered out in computational settings while retaining the core meaning/intent. Such words and phrases usually add noise and skew searches. For  example a search on 'the political history of spain'

**Ranking**: Subranking- some parts of the book metadata are of more importance than other patterns. This again depends on the application needs but for my case, I assume most searches are on the title and author rather than the subjects. Postgres allows for configuring which parts of a document should weigh more.

Note, I'm using Postgres 12

#### Text vectorization

Full-text search is ran on vectorized text rather than the direct text.

When text is vectorized using the specified dictionary, stop-words are filtered out, and the rest of the words are reduced to their 'base' word and packaged into a 'vector' that consists of all these base words plus the positions in which they appear in the text. The more frequent a base-word, or to use the actual technical term, a 'lexeme' appears the higher its weight. The lexemes are then ordered in the vector by their frequency. A lexeme is defined as a unit of lexical meaning.

```sql
select to_tsvector('The quick quick  brown fox jumps over the lazy lazy lazy dog');
```

The above query implicitly uses the default dictionary which is usually `english` but as per best practices, it should be made explicit as follows:

```sql
select to_tsvector('english'::regconfig, 'The quick quick  brown fox jumps over the lazy lazy lazy dog');
```

### Search, documents & normalization

Can normalization co-exist with full-text search

Rachid's blog post is a great starting point for full-text search in Postgres. The key idea I got from his post that was missing from other articles we need a notion of a 'document' with regards to full-text-search. From both wikipedia and the postgres documentation, which Rachid quotes:

> In text retrieval, **full-text search** refers to techniques for searching a single computer-stored **document** or a collection in a full-text database. The full-text search is distinguished from searches based on metadata or on parts of the original texts represented in databases. 
> 
> -- [Wikipedia](https://en.wikipedia.org/wiki/Full-text_search)

> A document is the unit of searching in a full-text search system; for example, a magazine article or email message.
> 
> -- [Postgres documentation](http://www.postgresql.org/docs/9.3/static/textsearch-intro.html#TEXTSEARCH-DOCUMENT)

Now, coming from Elasticsearch, the idea of a document is straighforward - a simple blob of JSON. Carrying over this approach to Postgres, I lazily dumped all the json into a `jsonb` column. In the book *Designing Data-intensive Applications*, Martin Kleppmann provides an even more generalized definition of a document. For lack of a better term, documents and document-oriented storage arguably 'encourage' denormalization. This isn't a big deal in Elasticsearch (a noSQL store), but in a relational database such as Postgres, it begets the question: can a normalized design coexist with full-text search? The answer, as usual, depends on the underlying data, its nature and one's application needs. Still, Rachid's approach is as close to a definite 'yes' for the the above conundrum: treat the document as a *logical* entity rather than a '*physical*' entity while retaining normalization. As he states: 

> This document [as a unit of search] can be across multiple tables and it represents a logical entity which we want to search for... A document is not related to our table schema but to data; together these represent a meaningful object.

Note, I've added the words in the bracket for some disambiguation. Therefore, we can (and should) normalize the design, then when building up a document, simply use good old-fashioned joins across the tables.

### Runnning search queries

* Multi-phrase queries: [link](https://www.postgresql.org/message-id/48691327.2080000%40sigaev.ru)

* Setting up multi-phrase search: https://www.monkeyatlarge.com/archives/2010/01/17/multiple-phrase-search-in-postgresql/

When a user provides a search term, it needs to be converted into suitable query format so that it can be used for the search. Postgres provides a couple of functions for converting search terms to `tsqueries` depending on the requirement. The simplest is `plainto_tsquery` which takes in the text and converts it to a tsquery. Usually, in a search phrase, the order in which words appear matters - for this, Postgres provides `phraseto_tsquery`. For advanced searches (think using logical operators in Google search), Postgres provides `to_tsquery`. Using `to_tsquery` for end-user searches such as from a web-application is a bit complicated since their search terms have to be parsed into a suitable format before being used in the query. For one, `to_tsquery` only takes words one by one which have to be combined  and grouped using operators. Initially, I started with `phraseto_tsquery` but found it too restrictive. Turns out, under the hood, `phraseto_tsquery` uses proximity. I shifted to `plainto_tsquery`. Luckily though, when reading through Rob Connery (a ?? add intro), I learnt that Postgres 12 introduced a new function `websearch_to_tsquery` which is supposed to be a suitable middleground between the two. Get further details from Rob's [blog post](https://rob.conery.io/2019/10/29/fine-tuning-full-text-search-with-postgresql-12/)

### Handling names using a different dictionary, searching using multiple dictionaries

For this, check out [this](https://rob.conery.io/2019/10/29/fine-tuning-full-text-search-with-postgresql-12/) Rob Connery post

### Optimization and Indexing

"Postgres supports function-based indexes so you can simply create a GIN index around the tsvector() function" - check out the Rachid post

* https://www.postgresql.org/docs/9.1/textsearch-indexes.htm

* Materialized view, again check out Rachid for this

* Multi-table: https://thoughtbot.com/blog/implementing-multi-table-full-text-search-with-postgres

* Optimizing, indexes and what-nots, materialized views: https://rob.conery.io/2018/07/23/setting-up-a-fast-comprehensive-search-routine-with-postgresql/

* More indepth on optimization, using RUM indexes, considering whether work_mem is enough, considering if a term results in multiple results vs few etc: https://blog.soykaf.com/post/postgresl-front-report/

### Spelling mistakes, fuzzy matches

* Check last part on Rachid

* Super fuzzy searching on PostgreSQL: [link](http://www.www-old.bartlettpublishing.com/site/bartpub/blog/3/entry/350)

### Handling book categories - clustering

So far the book categories have been included in the search. In total, there are 138,333 book category entries against 61,352  book entries. 

```sql
with subjects as (
    select jsonb_array_elements_text(details->'subjects') as subj  
    from books
)select count(*) from subjects;
--138333
```

Of all those,  34,045 categories are unique:

```sql
with subjects as (
    select jsonb_array_elements_text(details->'subjects') as subj  
    from books
)select count(distinct subj) from subjects;
---34045
```

Still, some of these categories are close enough that they should count as one kind of category. For example, we have the categories.

The goal here is to provide a different means of querying categories rather than using full-text search

* Postgres, python k-means clustering: https://www.cybertec-postgresql.com/en/machine-learning-in-postgresql-part-1-kmeans-clustering/

* kmeans 1.1.0: https://github.com/umitanuki/kmeans-postgresql/blob/master/doc/kmeans.md

### Adding new books

Project-gutenberg keeps on adding books. My update strategy so far bears the following assumptions, books already inserted are not modified, updates will be done once in a while eg once every 1 week. We have to download each book again.

The simplest approach is to use a `trigger` to update the search whenever a book is inserted or updated

### TODO

1. Multiple Phrase Search in PostgreSQL: https://www.monkeyatlarge.com/archives/2010/01/17/multiple-phrase-search-in-postgresql/

2. Understanding Full Text Search in PostgreSQL: https://linuxgazette.net/164/sephton.html

3. Fine Tuning Full Text Search with PostgreSQL 12: https://rob.conery.io/2019/10/29/fine-tuning-full-text-search-with-postgresql-12/

## REFERENCES

1. The State of (Full) Text Search in PostgreSQL 12: https://fosdem.org/2020/schedule/event/postgresql_the_state_of_full_text_search_in_postgresql_12/
2. The RUM index and Full-Text Search Using PostgreSQL: https://medium.com/datadriveninvestor/the-rum-index-and-full-text-search-using-postgresql-1c08fb3bf540
3. Similarity Analysis for PostgreSQL Text Databases: https://www.alibabacloud.com/blog/similarity-analysis-for-postgresql-text-databases_595341
4. GiST and GIN Index Types: https://www.postgresql.org/docs/9.1/textsearch-indexes.htm
