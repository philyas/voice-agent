# Database Dockerfile
# PostgreSQL with pgvector extension for RAG embeddings

FROM pgvector/pgvector:pg15

# Copy initialization scripts
COPY init/ /docker-entrypoint-initdb.d/

# Set default environment variables
ENV POSTGRES_USER=postgres
ENV POSTGRES_PASSWORD=postgres
ENV POSTGRES_DB=voice_agent

# Expose PostgreSQL port
EXPOSE 5432

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD pg_isready -U postgres || exit 1
