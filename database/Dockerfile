# Database Dockerfile
# PostgreSQL with initialization scripts

FROM postgres:15-alpine

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
