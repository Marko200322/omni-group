-- Faza 6: RAG document chunks (keyword search; pgvector = backlog)

CREATE TABLE IF NOT EXISTS ai_rag_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_id VARCHAR(255) NOT NULL,
  chunk_index INT NOT NULL DEFAULT 0,
  content TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_rag_chunks_user_source
  ON ai_rag_chunks (user_id, source_id);

CREATE INDEX IF NOT EXISTS idx_ai_rag_chunks_created
  ON ai_rag_chunks (user_id, created_at DESC);
