FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN grep -v "^supabase" requirements.txt > requirements_nosupa.txt && \
    pip install --no-cache-dir -r requirements_nosupa.txt && \
    pip install --no-cache-dir --no-deps supabase storage3 postgrest gotrue realtime supafunc

COPY . .

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
