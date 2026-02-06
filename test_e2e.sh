#!/bin/bash
set -e

echo "============================================================"
echo "  ACE PIPELINE END-TO-END TEST"
echo "============================================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Create test data
echo -e "${BLUE}============================================================${NC}"
echo -e "${BLUE}STEP 1: Creating test dataset${NC}"
echo -e "${BLUE}============================================================${NC}"

cat > /tmp/test_customer_data.csv << 'EOF'
customer_id,revenue,cost,transactions,customer_type,region
1,1000,500,10,Premium,North
2,1050,520,11,Standard,South
3,1100,540,12,Standard,East
4,1150,560,13,Premium,West
5,1200,580,14,Standard,North
6,1250,600,15,Standard,South
7,1300,620,16,Premium,East
8,1350,640,17,Standard,West
9,1400,660,18,Standard,North
10,1450,680,19,Premium,South
11,1500,700,20,Standard,East
12,1550,720,11,Standard,West
13,1600,740,12,Premium,North
14,1650,760,13,Standard,South
15,1700,780,14,Standard,East
16,1750,800,15,Premium,West
17,1800,820,16,Standard,North
18,1850,840,17,Standard,South
19,1900,860,18,Premium,East
20,1950,880,19,Standard,West
EOF

echo -e "${GREEN}✓ Created test dataset${NC}"
echo ""

# Start server in background
echo -e "${BLUE}============================================================${NC}"
echo -e "${BLUE}STEP 2: Starting backend server${NC}"
echo -e "${BLUE}============================================================${NC}"

cd backend
python3 -m uvicorn api.server:app --host 0.0.0.0 --port 8000 > /tmp/server.log 2>&1 &
SERVER_PID=$!
cd ..

echo -e "${YELLOW}→ Waiting for server to start (PID: $SERVER_PID)...${NC}"
sleep 5

# Check health
if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Server started successfully${NC}"
    curl -s http://localhost:8000/health | python3 -m json.tool || true
else
    echo -e "${RED}✗ Server failed to start${NC}"
    cat /tmp/server.log
    kill $SERVER_PID 2>/dev/null || true
    exit 1
fi
echo ""

# Test preview endpoint
echo -e "${BLUE}============================================================${NC}"
echo -e "${BLUE}STEP 3: Testing dataset preview endpoint${NC}"
echo -e "${BLUE}============================================================${NC}"

PREVIEW_RESPONSE=$(curl -s -X POST http://localhost:8000/run/preview \
  -F "file=@/tmp/test_customer_data.csv" \
  -w "\n%{http_code}")

HTTP_CODE=$(echo "$PREVIEW_RESPONSE" | tail -n 1)
PREVIEW_DATA=$(echo "$PREVIEW_RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ Preview endpoint successful${NC}"
    echo "$PREVIEW_DATA" | python3 -m json.tool || echo "$PREVIEW_DATA"
else
    echo -e "${RED}✗ Preview failed with HTTP $HTTP_CODE${NC}"
    echo "$PREVIEW_DATA"
fi
echo ""

# Test run submission
echo -e "${BLUE}============================================================${NC}"
echo -e "${BLUE}STEP 4: Testing run submission endpoint${NC}"
echo -e "${BLUE}============================================================${NC}"

TASK_INTENT='{"primary_question":"What factors drive customer revenue?","decision_context":"Customer segmentation","success_criteria":"Clear insights","required_output_type":"descriptive"}'

RUN_RESPONSE=$(curl -s -X POST http://localhost:8000/run \
  -F "file=@/tmp/test_customer_data.csv" \
  -F "task_intent=$TASK_INTENT" \
  -F "confidence_acknowledged=true" \
  -F "mode=full" \
  -w "\n%{http_code}")

HTTP_CODE=$(echo "$RUN_RESPONSE" | tail -n 1)
RUN_DATA=$(echo "$RUN_RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ Run submission successful${NC}"
    echo "$RUN_DATA" | python3 -m json.tool || echo "$RUN_DATA"
    RUN_ID=$(echo "$RUN_DATA" | python3 -c "import sys, json; print(json.load(sys.stdin)['run_id'])" 2>/dev/null || echo "")
else
    echo -e "${RED}✗ Run submission failed with HTTP $HTTP_CODE${NC}"
    echo "$RUN_DATA"
    RUN_ID=""
fi
echo ""

# Test progress endpoint
if [ -n "$RUN_ID" ]; then
    echo -e "${BLUE}============================================================${NC}"
    echo -e "${BLUE}STEP 5: Testing run progress endpoint${NC}"
    echo -e "${BLUE}============================================================${NC}"

    sleep 2
    PROGRESS_RESPONSE=$(curl -s http://localhost:8000/runs/$RUN_ID/progress -w "\n%{http_code}")
    HTTP_CODE=$(echo "$PROGRESS_RESPONSE" | tail -n 1)
    PROGRESS_DATA=$(echo "$PROGRESS_RESPONSE" | head -n -1)

    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✓ Progress endpoint successful${NC}"
        echo "$PROGRESS_DATA" | python3 -m json.tool || echo "$PROGRESS_DATA"
    else
        echo -e "${RED}✗ Progress check failed with HTTP $HTTP_CODE${NC}"
    fi
    echo ""
fi

# Test list runs
echo -e "${BLUE}============================================================${NC}"
echo -e "${BLUE}STEP 6: Testing list runs endpoint${NC}"
echo -e "${BLUE}============================================================${NC}"

LIST_RESPONSE=$(curl -s http://localhost:8000/runs?limit=10 -w "\n%{http_code}")
HTTP_CODE=$(echo "$LIST_RESPONSE" | tail -n 1)
LIST_DATA=$(echo "$LIST_RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ List runs endpoint successful${NC}"
    echo "$LIST_DATA" | python3 -m json.tool || echo "$LIST_DATA"
else
    echo -e "${RED}✗ List runs failed with HTTP $HTTP_CODE${NC}"
fi
echo ""

# Cleanup
echo -e "${BLUE}============================================================${NC}"
echo -e "${BLUE}STEP 7: Cleanup${NC}"
echo -e "${BLUE}============================================================${NC}"

echo -e "${YELLOW}→ Stopping server (PID: $SERVER_PID)...${NC}"
kill $SERVER_PID 2>/dev/null || true
wait $SERVER_PID 2>/dev/null || true
echo -e "${GREEN}✓ Server stopped${NC}"

rm -f /tmp/test_customer_data.csv
echo -e "${GREEN}✓ Test file removed${NC}"

echo ""
echo -e "${GREEN}============================================================${NC}"
echo -e "${GREEN}  ALL TESTS COMPLETED${NC}"
echo -e "${GREEN}============================================================${NC}"
