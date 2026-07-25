FROM python:3.10-slim

WORKDIR /workspace

# Install system dependencies including Tesseract OCR and OpenGL libraries for OpenCV headless
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    tesseract-ocr-eng \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Download spaCy model to bake it into the docker image
RUN python -m spacy download en_core_web_sm

# Copy service source code
COPY . .

EXPOSE 8001

# Run FastAPI microservice
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
