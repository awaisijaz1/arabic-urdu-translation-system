# Translation Evaluation Tool - Testing Guide

## 🧪 Testing Overview

This guide provides comprehensive testing instructions for the Translation Evaluation Tool, which is designed to review and validate existing Arabic-to-Urdu translations.

## ✅ Quick Test Results

The basic functionality has been verified:
- ✅ Sample data files are properly formatted
- ✅ SRT parsing works correctly
- ✅ JSON parsing works correctly  
- ✅ Translation validation logic is functional
- ✅ File operations are working

## 🚀 Testing Options

### Option 1: Basic Functionality Test (Recommended for Quick Start)

```bash
# Run the simple test suite
python simple_test.py
```

**Expected Output:**
```
🚀 Translation Evaluation Tool - Simple Testing Suite
============================================================
🧪 Testing Sample Data Quality...
✅ Sample data quality check successful!
🧪 Testing SRT Format...
✅ SRT parsing successful!
🧪 Testing JSON Format...
✅ JSON parsing successful!
🧪 Testing Translation Validation...
✅ Translation validation successful!
🧪 Testing File Operations...
✅ File operations successful!
============================================================
📊 Test Results: 5/5 tests passed
🎉 All tests passed! The translation evaluation tool is ready for use.
```

### Option 2: Full System Test (Requires Docker)

#### Prerequisites
1. **Install Docker Desktop**
   ```bash
   # Download from: https://www.docker.com/products/docker-desktop/
   # For macOS: brew install --cask docker
   ```

2. **Verify Docker Installation**
   ```bash
   docker --version
   docker-compose --version
   ```

#### Start the Full System
```bash
# Start all services
./start.sh

# Or manually
docker-compose up -d
```

#### Access the Application
- **Frontend**: http://localhost:3000
- **API Gateway**: http://localhost:8000
- **Health Check**: http://localhost:8000/health

#### Test Credentials
| Role | Username | Password |
|------|----------|----------|
| Admin | admin | admin123 |
| Editor | editor | editor123 |
| Viewer | viewer | viewer123 |

## 📁 Testing with Sample Data

### Sample Files Provided
- `sample-data/sample.srt` - SRT format with Arabic-Urdu translations
- `sample-data/sample.json` - JSON format with the same content

### Sample SRT Content
```
1
00:00:01,000 --> 00:00:04,000
مرحبا بكم في الأخبار
خبروں میں خوش آمدید

2
00:00:04,500 --> 00:00:07,500
هذا تقرير إخباري من الشرق الأوسط
یہ مشرق وسطی سے ایک خبری رپورٹ ہے
```

### Sample JSON Content
```json
{
  "metadata": {
    "title": "Arabic-Urdu News Broadcast",
    "language_pair": "ar-ur"
  },
  "segments": [
    {
      "start_time": "00:00:01.000",
      "end_time": "00:00:04.000",
      "original_text": "مرحبا بكم في الأخبار",
      "translated_text": "خبروں میں خوش آمدید"
    }
  ]
}
```

## 🔄 Testing Workflow

### 1. File Upload Test
1. Access http://localhost:3000
2. Login with test credentials
3. Navigate to "Upload Files"
4. Upload `sample-data/sample.srt` or `sample-data/sample.json`
5. Verify file is parsed correctly

### 2. Translation Review Test
1. Go to "Translation Jobs" or "Evaluation"
2. Select the uploaded file
3. Review the automatic translation assessment
4. Check that segments are marked as approved/needs revision

### 3. Human Evaluation Test
1. Review flagged segments
2. Edit translations if needed
3. Approve or reject segments
4. Add reviewer notes

### 4. Ground Truth Export Test
1. Navigate to "Ground Truth"
2. Export approved translations
3. Verify export formats (JSON/CSV)

## 🛠️ Manual Testing Commands

### Test Individual Services

```bash
# Test API Gateway
curl http://localhost:8000/health

# Test Input Service
curl http://localhost:8001/health

# Test Translation Service
curl http://localhost:8002/health

# Test Evaluation Service
curl http://localhost:8003/health

# Test Storage Service
curl http://localhost:8004/health
```

### Test File Upload API

```bash
# Upload SRT file
curl -X POST http://localhost:8000/upload \
  -F "file=@sample-data/sample.srt"

# Upload JSON file
curl -X POST http://localhost:8000/upload \
  -F "file=@sample-data/sample.json"
```

### Test Translation Review API

```bash
# Start review job
curl -X POST http://localhost:8000/review \
  -H "Content-Type: application/json" \
  -d '{
    "file_id": "your-file-id",
    "segments": [
      {
        "start_time": "00:00:01.000",
        "end_time": "00:00:04.000",
        "original_text": "مرحبا بكم في الأخبار",
        "translated_text": "خبروں میں خوش آمدید"
      }
    ]
  }'
```

## 🐛 Troubleshooting

### Common Issues

#### 1. Docker Not Running
```bash
# Start Docker Desktop
# Check Docker status
docker info
```

#### 2. Port Conflicts
```bash
# Check if ports are in use
lsof -i :3000
lsof -i :8000
lsof -i :8001
lsof -i :8002
lsof -i :8003
lsof -i :8004
```

#### 3. Service Health Issues
```bash
# Check service logs
docker-compose logs api-gateway
docker-compose logs input-service
docker-compose logs translation-service
docker-compose logs evaluation-service
docker-compose logs storage-service
docker-compose logs frontend
```

#### 4. File Upload Issues
- Ensure file is UTF-8 encoded
- Check file size (max 10MB default)
- Verify file format (SRT or JSON)

#### 5. Authentication Issues
- Clear browser cache
- Check JWT token expiration
- Verify user credentials

### Debug Mode

```bash
# Start in development mode with logs
./start.sh dev

# Or manually with logs
docker-compose -f docker-compose.dev.yml up
```

## 📊 Performance Testing

### Load Testing

```bash
# Test file upload performance
for i in {1..10}; do
  curl -X POST http://localhost:8000/upload \
    -F "file=@sample-data/sample.srt"
done

# Test concurrent reviews
# (Use tools like Apache Bench or wrk)
```

### Memory Usage

```bash
# Monitor Docker container resources
docker stats

# Check specific service memory
docker stats api-gateway input-service translation-service
```

## 🔧 Custom Testing

### Create Custom Test Files

```bash
# Create custom SRT file
cat > custom_test.srt << EOF
1
00:00:01,000 --> 00:00:04,000
نص تجريبي للاختبار
ٹیسٹ کے لیے نمونہ متن

2
00:00:04,500 --> 00:00:07,500
نص آخر للاختبار
آخری ٹیسٹ متن
EOF

# Create custom JSON file
cat > custom_test.json << EOF
{
  "metadata": {
    "title": "Custom Test",
    "language_pair": "ar-ur"
  },
  "segments": [
    {
      "start_time": "00:00:01.000",
      "end_time": "00:00:04.000",
      "original_text": "نص تجريبي للاختبار",
      "translated_text": "ٹیسٹ کے لیے نمونہ متن"
    }
  ]
}
EOF
```

### Test Edge Cases

1. **Empty Files**
2. **Malformed SRT/JSON**
3. **Large Files**
4. **Special Characters**
5. **Missing Translations**

## 📈 Monitoring and Metrics

### Health Checks
```bash
# Overall system health
curl http://localhost:8000/health

# Individual service health
curl http://localhost:8001/health
curl http://localhost:8002/health
curl http://localhost:8003/health
curl http://localhost:8004/health
```

### Metrics
```bash
# Review statistics
curl http://localhost:8002/stats

# Evaluation metrics
curl http://localhost:8003/metrics

# Storage metrics
curl http://localhost:8004/metrics
```

## 🎯 Test Scenarios

### Scenario 1: Basic Workflow
1. Upload sample SRT file
2. Review automatic assessment
3. Approve good translations
4. Edit poor translations
5. Export ground truth

### Scenario 2: Quality Assessment
1. Upload file with mixed quality translations
2. Verify automatic quality scoring
3. Check reviewer recommendations
4. Validate final approved translations

### Scenario 3: Batch Processing
1. Upload multiple files
2. Process reviews in parallel
3. Monitor system performance
4. Export all approved translations

## 📝 Test Checklist

- [ ] Basic functionality test passes
- [ ] Docker installation verified
- [ ] All services start successfully
- [ ] Web interface accessible
- [ ] File upload works
- [ ] Translation review functions
- [ ] Human evaluation interface works
- [ ] Ground truth export works
- [ ] Authentication functions
- [ ] Error handling works
- [ ] Performance acceptable

## 🆘 Getting Help

If you encounter issues:

1. **Check the troubleshooting section above**
2. **Review service logs**
3. **Verify configuration**
4. **Test with sample files**
5. **Contact development team**

## 📄 Test Reports

After running tests, document:
- Test environment details
- Test results summary
- Issues encountered
- Performance metrics
- Recommendations

---

**Happy Testing! 🎉** 

---

## How to Fix: Use Module-Relative Imports with `PYTHONPATH`

### 1. **Set `PYTHONPATH` in Dockerfiles**
Add this line before running your app in each Python service Dockerfile:
```dockerfile
<code_block_to_apply_changes_from>
ENV PYTHONPATH=/app
```
This tells Python to treat `/app` (the working directory) as the root for imports, so `from models import ...` will work.

### 2. **Make Sure All Service Entrypoints Use Absolute Imports**
- All imports like `from models import ...` and `from parsers import ...` should be absolute, not relative.

---

## Next Steps

1. **Update each service's Dockerfile** (input-service, translation-service, evaluation-service, storage-service) to include:
   ```dockerfile
   ENV PYTHONPATH=/app
   ```
   just before the `CMD` or `ENTRYPOINT` line.

2. **Rebuild and restart the containers:**
   ```bash
   docker-compose build --no-cache
   docker-compose up -d
   ```

Would you like me to make these Dockerfile changes for you? 