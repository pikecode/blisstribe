#!/usr/bin/env bash
#
# BlissTribe 本地冒烟验收脚本
#
# 用法:
#   ./scripts/check-local.sh
#   API_BASE_URL=http://localhost:4000/api/v1 ./scripts/check-local.sh
#
# 检查范围只覆盖当前已经正式接入的主链路:
# - 后台登录
# - 标签列表
# - 产品列表
# - 推荐列表
# - 推荐事件上报
# - 后台推荐分析
# - 活动列表和后台报名列表
# - 活动事件上报和统一分析口径
# - 场地设施字典、场地列表和活动场地关联

set -euo pipefail

API_BASE_URL="${API_BASE_URL:-http://localhost:4000/api/v1}"
ADMIN_USERNAME="${ADMIN_USERNAME:-admin}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-admin123}"

fail() {
  echo "[fail] $1" >&2
  exit 1
}

pass() {
  echo "[ok] $1"
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "缺少命令: $1"
}

request() {
  local method="$1"
  local url="$2"
  local body="${3:-}"
  local auth="${4:-}"

  if [ -n "$body" ] && [ -n "$auth" ]; then
    curl -sS -X "$method" "$url" -H "Content-Type: application/json" -H "Authorization: $auth" -d "$body"
  elif [ -n "$body" ]; then
    curl -sS -X "$method" "$url" -H "Content-Type: application/json" -d "$body"
  elif [ -n "$auth" ]; then
    curl -sS -X "$method" "$url" -H "Authorization: $auth"
  else
    curl -sS -X "$method" "$url"
  fi
}

json_get() {
  node -e "let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>{const r=JSON.parse(s); const value = $1; if (value === undefined || value === null) process.exit(2); if (typeof value === 'object') console.log(JSON.stringify(value)); else console.log(value);})"
}

assert_code_200() {
  local name="$1"
  local response="$2"
  local code
  code="$(printf '%s' "$response" | json_get 'r.code')" || fail "$name 响应不是有效 JSON: $response"
  [ "$code" = "200" ] || fail "$name 失败，code=${code}，响应: $response"
  pass "$name"
}

require_cmd curl
require_cmd node

echo "BlissTribe 本地冒烟验收"
echo "API: $API_BASE_URL"
echo ""

login_response="$(request POST "$API_BASE_URL/admin/login" "{\"username\":\"$ADMIN_USERNAME\",\"password\":\"$ADMIN_PASSWORD\"}")"
assert_code_200 "后台登录" "$login_response"
token="$(printf '%s' "$login_response" | json_get 'r.data && r.data.token')" || fail "后台登录未返回 token"

tags_response="$(request GET "$API_BASE_URL/tags?status=1")"
assert_code_200 "标签列表" "$tags_response"
tag_count="$(printf '%s' "$tags_response" | json_get 'Array.isArray(r.data) ? r.data.length : (r.data && r.data.list ? r.data.list.length : 0)')"
[ "$tag_count" -gt 0 ] || fail "标签列表为空"
pass "标签数量: $tag_count"

products_response="$(request GET "$API_BASE_URL/admin/products?page=1&pageSize=2" "" "$token")"
assert_code_200 "后台产品列表" "$products_response"
product_id="$(printf '%s' "$products_response" | json_get 'r.data && r.data.list && r.data.list[0] && r.data.list[0].id')" || fail "后台产品列表为空"
pass "样例产品 ID: $product_id"

recommended_response="$(request GET "$API_BASE_URL/products/recommended?moduleCode=health&tags=%E7%9D%A1%E7%9C%A0%E6%94%B9%E5%96%84&limit=2")"
assert_code_200 "推荐产品列表" "$recommended_response"
recommended_count="$(printf '%s' "$recommended_response" | json_get 'Array.isArray(r.data) ? r.data.length : (r.data && r.data.list ? r.data.list.length : 0)')"
[ "$recommended_count" -gt 0 ] || fail "推荐产品列表为空"
pass "推荐产品数量: $recommended_count"

event_body="{\"productId\":$product_id,\"eventType\":\"impression\",\"sourceScene\":\"local-smoke\",\"recommendationForm\":\"module_featured\",\"tags\":[],\"tagIds\":[],\"score\":1,\"reason\":\"本地冒烟验收\"}"
event_response="$(request POST "$API_BASE_URL/products/events" "$event_body")"
assert_code_200 "推荐事件上报" "$event_response"

analytics_response="$(request GET "$API_BASE_URL/admin/products/analytics" "" "$token")"
assert_code_200 "后台推荐分析" "$analytics_response"

lead_summary_response="$(request GET "$API_BASE_URL/admin/product-leads/summary" "" "$token")"
assert_code_200 "线索跟进摘要" "$lead_summary_response"

venues_response="$(request GET "$API_BASE_URL/admin/venues?page=1&pageSize=2" "" "$token")"
assert_code_200 "后台场地列表" "$venues_response"
venue_count="$(printf '%s' "$venues_response" | json_get 'r.data && r.data.list ? r.data.list.length : 0')"
[ "$venue_count" -gt 0 ] || fail "后台场地列表为空，请先执行 prisma seed"
pass "场地数量: $venue_count"
venue_facility_id_count="$(printf '%s' "$venues_response" | json_get 'r.data && r.data.list && r.data.list[0] && Array.isArray(r.data.list[0].facilityIds) ? r.data.list[0].facilityIds.length : 0')"
[ "$venue_facility_id_count" -gt 0 ] || fail "后台场地列表缺少 facilityIds"
pass "场地关联设施数量: $venue_facility_id_count"

venue_facilities_response="$(request GET "$API_BASE_URL/admin/venue-facilities" "" "$token")"
assert_code_200 "后台场地设施字典" "$venue_facilities_response"
venue_facility_count="$(printf '%s' "$venue_facilities_response" | json_get 'Array.isArray(r.data) ? r.data.length : 0')"
[ "$venue_facility_count" -gt 0 ] || fail "后台场地设施字典为空，请先执行 prisma seed"
pass "场地设施字典数量: $venue_facility_count"

public_venues_response="$(request GET "$API_BASE_URL/venues")"
assert_code_200 "公开场地列表" "$public_venues_response"

activities_response="$(request GET "$API_BASE_URL/activities?statusScope=registering&page=1&pageSize=2")"
assert_code_200 "活动列表" "$activities_response"
activity_id="$(printf '%s' "$activities_response" | json_get 'r.data && r.data.list && r.data.list[0] && r.data.list[0].id')" || fail "活动列表为空"
pass "样例活动 ID: $activity_id"

activity_event_body="{\"activityId\":$activity_id,\"eventType\":\"impression\",\"sourceScene\":\"local-smoke-activity\",\"recommendationForm\":\"activity_featured\",\"tags\":[],\"tagIds\":[],\"metadata\":{\"check\":\"activity_impression\"}}"
activity_event_response="$(request POST "$API_BASE_URL/products/events" "$activity_event_body")"
assert_code_200 "活动事件上报" "$activity_event_response"

recommended_activities_response="$(request GET "$API_BASE_URL/activities/recommended?moduleCode=health&limit=2")"
assert_code_200 "推荐活动列表" "$recommended_activities_response"
recommended_activity_count="$(printf '%s' "$recommended_activities_response" | json_get 'Array.isArray(r.data) ? r.data.length : 0')"
[ "$recommended_activity_count" -gt 0 ] || fail "推荐活动列表为空"
pass "推荐活动数量: $recommended_activity_count"

admin_activities_response="$(request GET "$API_BASE_URL/admin/activities?page=1&pageSize=2" "" "$token")"
assert_code_200 "后台活动列表" "$admin_activities_response"
activity_venue_count="$(printf '%s' "$admin_activities_response" | json_get 'r.data && r.data.list ? r.data.list.filter(item => item.venueId && item.venue).length : 0')"
[ "$activity_venue_count" -gt 0 ] || fail "后台活动列表缺少场地关联活动"
pass "活动场地关联条目: $activity_venue_count"

activity_registrations_response="$(request GET "$API_BASE_URL/admin/activity-registrations?page=1&pageSize=2" "" "$token")"
assert_code_200 "后台活动报名列表" "$activity_registrations_response"

analytics_after_activity_response="$(request GET "$API_BASE_URL/admin/products/analytics" "" "$token")"
assert_code_200 "统一推荐活动分析" "$analytics_after_activity_response"
activity_stats_count="$(printf '%s' "$analytics_after_activity_response" | json_get 'r.data && Array.isArray(r.data.activityStats) ? r.data.activityStats.length : 0')"
[ "$activity_stats_count" -gt 0 ] || fail "统一推荐活动分析缺少 activityStats"
pass "活动分析条目: $activity_stats_count"

echo ""
pass "本地冒烟验收通过"
