"""DEPRECATED - Apache Solr Integration

This file is no longer used in RAG Lite. Apache Solr indexing has been replaced
with ChromaDB vector storage.

RAG Lite does not support:
- Apache Solr integration
- BM25 full-text search
- Solr-based document indexing

All vector storage and retrieval now uses ChromaDB exclusively.
"""

raise NotImplementedError(
    "Apache Solr integration is no longer supported. "
    "RAG Lite uses ChromaDB for all storage and retrieval."
)



class SolrNotFoundError(Exception):
    pass


class SolrSelectResult(BaseModel):
    id: str
    content: Optional[list[str]] = [""]
    chunk_number_i: Optional[int] = -1
    file_path_s: Optional[str] = ""
    title: Optional[list[str]] = [""]


def get_solr_doc_by_id(solr_url: str, core: str, doc_id: str) -> SolrSelectResult:
    """
    Using the /select api to get the content of a document by its ID.
    """
    try:
        params = {
            "q": f"id:{doc_id}",
            "fl": "id,content,chunk_number_i,file_path_s,title",
            "wt": "json",
        }
        url = f"{solr_url}/solr/{core}/select"
        resp = requests.get(url, params=params)
        resp.raise_for_status()
        data = resp.json()
        docs = data.get("response", {}).get("docs", [])
        if not docs:
            raise SolrNotFoundError(f"Document {doc_id} not found")

        return SolrSelectResult(**docs[0])

    except Exception as e:
        logger.error(f"Error fetching Solr document: {e}")
        return SolrSelectResult(id=doc_id)


if __name__ == "__main__":

    solr_url = config.ApacheSolr.url
    core = "mycore"
    doc_id = "page-4#vCBh8r_iaIFSZzOpOLeZc.pdf"

    content = get_solr_doc_by_id(solr_url, core, doc_id)
    print(content)
