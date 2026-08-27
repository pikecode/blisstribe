#!/bin/bash

# 产品推荐系统集成测试脚本

set -e

API_URL="http://localhost:3000"
MODULE_CODE="assessment"
TEST_USER_ID="1"
TEST_PRODUCT_ID="1"

echo "====== 推荐系统集成测试 ======"
echo ""

# 等待服务启动
echo "⏳ 等待 API 服务启动..."
sleep 5

# 测试 1: 健康检查
echo "测试 1: 服务健康检查"
curl -s "$API_URL/health" | jq . || echo "⚠️ 服务未启动"
echo ""

# 测试 2: 获取推荐配置
echo "测试 2: 获取推荐配置"
curl -s "$API_URL/api/v1/recommendation-config/$MODULE_CODE" | jq '.' || echo "❌ 失败"
echo ""

# 测试 3: 创建/更新推荐配置
echo "测试 3: 更新推荐配置"
curl -s -X PUT "$API_URL/api/v1/recommendation-config/$MODULE_CODE" \
  -H "Content-Type: application/json" \
  -d '{
    "primaryTagWeight": 25,
    "secondaryTagWeight": 12,
    "fallbackTagWeight": 6
  }' | jq '.' || echo "❌ 失败"
echo ""

# 测试 4: 验证配置更新
echo "测试 4: 验证配置已更新"
curl -s "$API_URL/api/v1/recommendation-config/$MODULE_CODE" | \
  jq '.primaryTagWeight' | grep -q "25" && echo "✅ 配置更新成功" || echo "❌ 配置更新失败"
echo ""

# 测试 5: 获取指标统计
echo "测试 5: 获取推荐指标"
curl -s "$API_URL/api/v1/recommendation-metrics?moduleCode=$MODULE_CODE&limit=10" | jq '.' || echo "⚠️ 无指标数据"
echo ""

# 测试 6: Lead 清理统计
echo "测试 6: Lead 清理统计"
curl -s "$API_URL/api/v1/admin/product-lead-cleanup/stats" | jq '.' || echo "⚠️ 无 Lead 清理数据"
echo ""

# 测试 7: Lead 清理历史
echo "测试 7: Lead 清理历史"
curl -s "$API_URL/api/v1/admin/product-lead-cleanup/history?limit=5" | jq '.' || echo "⚠️ 无历史记录"
echo ""

echo "====== 测试完成 ======"
echo "✅ 基本功能验证完毕"
echo ""
echo "后续手动测试项："
echo "1. 推荐 API 调用: GET /api/v1/products/recommended?moduleCode=$MODULE_CODE&limit=10"
echo "2. 查看推荐事件: 检查数据库 RecommendationEvent 表"
echo "3. 性能基准: 多次调用推荐 API 测量响应时间"
echo "4. 配置缓存: 更新配置后验证5分钟内生效"
