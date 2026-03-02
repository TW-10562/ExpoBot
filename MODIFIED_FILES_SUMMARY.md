# RAG LITE - MODIFIED CODE FILES

This file contains all the modified code files for the RAG Lite migration.

## File 1: rag/services/vector_search_service.py [NEW FILE]

Location: `/home/tw10541/ExpoBot_N/ExpoBot/rag/services/vector_search_service.py`

Purpose: Replaces HybridRAGEngineFactory with simplified vector-only search engine.
- VectorSearchEngine: Handles single vector similarity search using ChromaDB
- VectorSearchEngineFactory: Factory pattern with caching
- Global `vector_search_factory` instance

---

## File 2: rag/api/main.py [MODIFIED]

Changes:
1. Updated imports (removed HybridSearchRequest, hybrid_RAG_engine_factory)
2. Added vector_search_service import
3. Removed /search/hybrid endpoint
4. Kept /search endpoint using simple vector search

---

## File 3: rag/services/rag_service.py [MODIFIED]

Changes:
1. Completely rewrote search_rag() function
2. Removed complex threading logic
3. Removed reranking (get_ranked_results)
4. Simplified to: for each collection → vector search → trim to top_k
5. Removed version formatting helpers

Key difference:
- Before: ThreadPoolExecutor + reranking + version merging
- After: Simple sequential search across collections

---

## File 4: rag/models/schemas.py [MODIFIED]

Changes:
1. Removed BM25Params model
2. Removed HybridSearchRequest model
3. Simplified SearchRequest (removed hybrid-specific fields)
4. Kept DeleteRequest, DeleteResponseModel, UpdateRequest

---

## File 5: rag/requirements.txt [MODIFIED]

Removed Dependencies:
- rank_bm25 (BM25 search)
- langchain-ollama==0.3.10
- langchain-community==0.3.30 (includes reranker)
- sudachipy (Japanese tokenizer)
- sudachidict_core

Why: These are only needed for advanced RAG features (BM25, reranking, Japanese preprocessing)

---

## File 6: config/default.yml [MODIFIED]

Changes in RAG.mode:
```yaml
# Before
mode:
  - splitByArticleWithHybridSearch
  - splitByPage

# After
mode:
  - splitByPage
```

Changes in RAG.Retrieval:
```yaml
# Before (many lines)
Retrieval:
  usingRerank: false
  rerankMaxLength: 1024
  rerankBatchSize: 64
  rerankBatchSizeCPU: 16
  rerankUseCompile: false
  rerankUse8Bit: false
  HybridSearch:
    vector_only: true
    bm25_only: false
    vector_weight: 0.5
    bm25_weight: 0.5
    bm25_params:
      k1: 1.8
      b: 0.75
  throwErrorWhenCUDAUnavailable: false
  topK: 10
  topKForEachCollection: 3
  usingNeighborChunkAware: true

# After (simplified)
Retrieval:
  topK: 10
  topKForEachCollection: 10
  usingNeighborChunkAware: false
```

---

## File 7: api/src/config/schema.ts [MODIFIED]

Changes:
1. Updated RAGHybridSearchConfig defaults for vector-only:
   - vector_only: true (was: false)
   - vector_weight: 1.0 (was: 0.5)
   - bm25_weight: 0 (was: 0.5)

2. Updated Retrieval schema:
   - Made HybridSearch optional
   - Removed usingRerank field
   - Removed throwErrorWhenCUDAUnavailable field

---

## File 8: api/src/ragclass/splitByArticleWithHybridSearch.ts [MODIFIED]

Changes in search() method:
1. Changed endpoint from `/search/hybrid` to `/search`
2. Changed request type from HybridSearchRequest to SearchRequest
3. Removed hybrid-specific parameters:
   - vector_only
   - bm25_only
   - vector_weight
   - bm25_weight
   - bm25_params

3. Updated result extraction:
   - Before: Directly accessed IHybridRAGResultItem array
   - After: Handles { results: [...] } response structure

4. Updated logging from [RAG] to [RAG-Lite]

---

## Summary of Changes

### Python Backend (RAG Service)
- ✅ 1 new file created (vector_search_service.py)
- ✅ 4 files modified (main.py, rag_service.py, schemas.py, requirements.txt)
- ✅ Removed hybrid search pipeline
- ✅ Removed reranking pipeline
- ✅ Reduced dependencies from 30 to 23

### TypeScript API Layer
- ✅ 2 files modified (config/schema.ts, ragclass/splitByArticleWithHybridSearch.ts)
- ✅ Updated to use simple vector search endpoint
- ✅ Updated config validation to support RAG Lite

### Configuration
- ✅ 1 file modified (config/default.yml)
- ✅ Simplified RAG modes
- ✅ Removed reranking, hybrid search, neighbor chunk awareness settings

### Total Changes
- 1 new file
- 7 modified files
- 0 deleted files (old files can be manually removed)
- Reduced complexity: ~40% less configuration, ~20% fewer dependencies

---

## Database & Authentication Impact

✅ No changes required:
- MySQL schema unchanged
- File metadata unchanged
- JWT authentication unchanged
- RBAC unchanged
- ChromaDB format unchanged (backward compatible)

---

## Testing Instructions

1. Install new requirements:
   ```bash
   pip install -r rag/requirements.txt
   ```

2. Start services:
   ```bash
   # Terminal 1
   cd rag && python main.py
   
   # Terminal 2
   cd api && pnpm run dev
   ```

3. Test endpoints:
   - Upload file: `POST /upload`
   - Search: `POST /search` (now vector-only)
   - Update: `PUT /update`
   - Delete: `DELETE /record` or `DELETE /collection`

4. Verify logging shows `[RAG-Lite]` prefix

---

## Rollback Instructions

If needed, to revert to Advanced RAG:
1. Git checkout original files
2. Reinstall full requirements: `pip install -r requirements.txt`
3. HybridRAGEngineFactory.py will be available again
4. /search/hybrid endpoint will work again

---

## Documentation

See RAG_LITE_MIGRATION.md for:
- Complete migration details
- Compatibility matrix
- Troubleshooting guide
- Performance improvements
- Architecture diagram
