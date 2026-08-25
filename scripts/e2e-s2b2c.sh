#!/usr/bin/env bash
# 本地 S2B2C 主链路验收：B 审核通过 -> 邀请码 -> C 注册 -> B/S 可见客户关系
set -euo pipefail

cd "$(dirname "$0")/.."

API_BASE="${API_BASE:-http://localhost:4000/api/v1}"
ADMIN_USERNAME="${ADMIN_USERNAME:-admin}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-admin123}"
if [ -z "${JWT_ACCESS_SECRET:-}" ]; then
  if [ -f .env.production ]; then
    JWT_ACCESS_SECRET="$(grep '^JWT_ACCESS_SECRET=' .env.production | head -n 1 | cut -d= -f2-)"
  elif [ -f apps/api/.env ]; then
    JWT_ACCESS_SECRET="$(grep '^JWT_ACCESS_SECRET=' apps/api/.env | head -n 1 | cut -d= -f2-)"
  fi
fi
JWT_SECRET="${JWT_ACCESS_SECRET:-blisstribe_access_secret_2026_32chars}"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo -e "${GREEN}[s2b2c-e2e]${NC} $1"; }
warn() { echo -e "${YELLOW}[warn]${NC} $1"; }
err() { echo -e "${RED}[err]${NC} $1"; }

psql_db() {
  if [ -z "${PSQL_DATABASE_URL:-}" ]; then
    if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1 && docker ps --format '{{.Names}}' | grep -qx 'blisstribe-db'; then
      docker exec blisstribe-db psql -U blisstribe -d blisstribe -tAc "$1"
      return
    elif [ -n "${DATABASE_URL:-}" ]; then
      PSQL_DATABASE_URL="$DATABASE_URL"
    elif [ -f apps/api/.env ]; then
      PSQL_DATABASE_URL="$(grep '^DATABASE_URL=' apps/api/.env | head -n 1 | cut -d= -f2-)"
    fi
  fi
  if [ -z "${PSQL_DATABASE_URL:-}" ]; then
    err "未找到 DATABASE_URL，无法连接本地 PostgreSQL"
    exit 1
  fi

  local clean_url="${PSQL_DATABASE_URL%%\?*}"
  clean_url="${clean_url/127.0.0.1/localhost}"
  psql "$clean_url" -tAc "$1"
}

json_get() {
  node -e "let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>{const o=JSON.parse(s); const path=process.argv[1].split('.'); let v=o; for (const p of path) v=v?.[p]; if (v === undefined || v === null) process.exit(2); console.log(v);})" "$1"
}

sign_user_token() {
  local user_id="$1"
  local jti="$2"
  node -e "const crypto=require('crypto'); const b=o=>Buffer.from(JSON.stringify(o)).toString('base64url'); const header=b({alg:'HS256',typ:'JWT'}); const now=Math.floor(Date.now()/1000); const payload=b({userId:'$user_id',jti:'$jti',platform:'wechat-mp',iat:now,exp:now+7200}); const sig=crypto.createHmac('sha256','$JWT_SECRET').update(header+'.'+payload).digest('base64url'); console.log(header+'.'+payload+'.'+sig)"
}

log "检查 API 可用性：$API_BASE"
curl -fsS "$API_BASE/invitation/resolve" \
  -H 'Content-Type: application/json' \
  -d '{"code":"PING"}' >/dev/null

log "登录 S 后台管理员"
ADMIN_TOKEN=$(curl -fsS -X POST "$API_BASE/admin/login" \
  -H 'Content-Type: application/json' \
  -d "{\"username\":\"$ADMIN_USERNAME\",\"password\":\"$ADMIN_PASSWORD\"}" | json_get data.token)

TS="$(date +%s)"
RAND="$RANDOM"
PARTNER_ID="${1:-$(psql_db 'select id from "Partner" order by id limit 1;')}"
if [ -z "$PARTNER_ID" ]; then
  log "没有可验收的 B 主体，自动创建验收测试主体"
  OWNER_PHONE="137$(printf '%08d' "$((TS % 100000000))")"
  OWNER_INVITE_CODE="BO${TS: -4}${RAND:0:2}"
  PARTNER_NO="P-E2E-${TS}-${RAND}"
  PARTNER_ID=$(psql_db "with owner_user as (insert into \"User\" (\"phoneCiphertext\", \"phoneHash\", \"phoneMasked\", nickname, avatar, gender, status, tags, identity, \"inviteCode\", \"updatedAt\") values (convert_to('$OWNER_PHONE','UTF8'), 'e2e_owner_$OWNER_PHONE', substring('$OWNER_PHONE' from 1 for 3) || '****' || substring('$OWNER_PHONE' from 8 for 4), '验收B负责人', '$API_BASE/uploads/owner-avatar.png', 0, 1, '{}', 'B', '$OWNER_INVITE_CODE', now()) returning id), partner as (insert into \"Partner\" (\"partnerNo\", \"displayName\", type, status, \"auditStatus\", \"contactName\", \"contactPhoneCiphertext\", \"contactPhoneHash\", \"contactPhoneMasked\", \"regionCode\", profile, \"updatedAt\") select '$PARTNER_NO', '验收测试经营主体', 'group_leader', 0, 0, '验收负责人', convert_to('$OWNER_PHONE','UTF8'), 'e2e_partner_$OWNER_PHONE', substring('$OWNER_PHONE' from 1 for 3) || '****' || substring('$OWNER_PHONE' from 8 for 4), '深圳', '{\"description\":\"本地端到端验收主体\"}'::jsonb, now() from owner_user returning id) insert into \"PartnerMember\" (\"partnerId\", \"userId\", role, status, \"updatedAt\") select partner.id, owner_user.id, 'owner', 1, now() from partner, owner_user returning \"partnerId\";" | head -n 1)
fi

PARTNER_NAME=$(psql_db "select \"displayName\" from \"Partner\" where id = $PARTNER_ID;")
PARTNER_STATUS=$(psql_db "select status from \"Partner\" where id = $PARTNER_ID;")
log "使用 B 主体：#${PARTNER_ID} ${PARTNER_NAME}，当前状态=${PARTNER_STATUS}"

if [ "$PARTNER_STATUS" != "1" ]; then
  log "审核通过 B 主体"
  curl -fsS -X POST "$API_BASE/admin/partners/$PARTNER_ID/approve" \
    -H "Authorization: $ADMIN_TOKEN" >/dev/null
else
  warn "B 主体已是正常状态，跳过审核动作"
fi

INVITE_CODE=$(psql_db "select code from \"InvitationCode\" where \"ownerType\"='partner' and \"ownerId\"=$PARTNER_ID and scene='register' and status=1 order by id desc limit 1;")
if [ -z "$INVITE_CODE" ]; then
  err "审核后未找到 B 邀请码"
  exit 1
fi
log "B 邀请码：$INVITE_CODE"

TEMP_TOKEN="temp_e2e_${TS}_${RAND}"
PHONE="139$(printf '%08d' "$((TS % 100000000))")"
WX_HASH="e2e_wx_${TS}_${RAND}"

log "创建 C 注册临时态"
psql_db "insert into \"UserRegisterTemp\" (\"tempToken\", \"wxOpenIdHash\", \"wxNickname\", \"wxGender\", \"phoneCiphertext\", \"phoneHash\", \"phoneMasked\", \"expiresAt\") values ('$TEMP_TOKEN', '$WX_HASH', '端到端C用户', 0, convert_to('$PHONE', 'UTF8'), 'e2e_phone_$PHONE', substring('$PHONE' from 1 for 3) || '****' || substring('$PHONE' from 8 for 4), now() + interval '10 minutes');" >/dev/null

log "C 带 B 邀请码注册"
REGISTER_RESULT=$(curl -fsS -X POST "$API_BASE/auth/register" \
  -H 'Content-Type: application/json' \
  -d "{\"tempToken\":\"$TEMP_TOKEN\",\"nickname\":\"端到端C用户\",\"avatar\":\"http://localhost:4000/uploads/e2e-avatar.png\",\"gender\":0,\"identity\":\"C\",\"inviteCode\":\"$INVITE_CODE\",\"agreement\":true}")
C_USER_ID=$(echo "$REGISTER_RESULT" | json_get data.userInfo.id)
log "C 注册成功：userId=${C_USER_ID}"

RELATION_ID=$(psql_db "select id from \"CustomerRelation\" where \"partnerId\"=$PARTNER_ID and \"customerUserId\"=$C_USER_ID and status=1 limit 1;")
if [ -z "$RELATION_ID" ]; then
  err "未生成 CustomerRelation"
  exit 1
fi
log "客户关系生成：relationId=${RELATION_ID}"

log "验证 S 后台可见客户关系"
ADMIN_CUSTOMERS=$(curl -fsS "$API_BASE/admin/partners/$PARTNER_ID/customers?page=1&pageSize=10" \
  -H "Authorization: $ADMIN_TOKEN")
echo "$ADMIN_CUSTOMERS" | grep -q "\"customerUserId\":$C_USER_ID"

OWNER_ID=$(psql_db "select \"userId\" from \"PartnerMember\" where \"partnerId\"=$PARTNER_ID and role='owner' and status=1 order by id limit 1;")
if [ -z "$OWNER_ID" ]; then
  err "未找到 B 负责人"
  exit 1
fi
JTI="e2e_owner_${TS}_${RAND}"
OWNER_TOKEN=$(sign_user_token "$OWNER_ID" "$JTI")
psql_db "insert into \"UserSession\" (\"userId\", jti, \"refreshTokenHash\", \"expiresAt\", \"refreshExpiresAt\", platform, status, \"updatedAt\") values ($OWNER_ID, '$JTI', 'e2e', now() + interval '2 hours', now() + interval '7 days', 'wechat-mp', 1, now());" >/dev/null

log "验证 B 端可见客户关系"
B_CUSTOMERS=$(curl -fsS "$API_BASE/partner/customers?page=1&pageSize=10" \
  -H "Authorization: Bearer $OWNER_TOKEN")
echo "$B_CUSTOMERS" | grep -q "\"customerUserId\":$C_USER_ID"

MANUAL_PHONE="138$(printf '%08d' "$(((TS + RAND) % 100000000))")"
log "创建一个未归属 C 用户，用于验证 S 手动调整归属"
MANUAL_C_USER_ID=$(psql_db "insert into \"User\" (\"phoneCiphertext\", \"phoneHash\", \"phoneMasked\", nickname, avatar, gender, status, tags, identity, \"updatedAt\") values (convert_to('$MANUAL_PHONE', 'UTF8'), 'manual_transfer_$MANUAL_PHONE', substring('$MANUAL_PHONE' from 1 for 3) || '****' || substring('$MANUAL_PHONE' from 8 for 4), '手动归属C用户', 'http://localhost:4000/uploads/manual-avatar.png', 0, 1, '{}', 'C', now()) returning id;" | head -n 1)

log "S 后台将未归属 C 用户调整到 B 主体"
TRANSFER_RESULT=$(curl -fsS -X POST "$API_BASE/admin/partners/$PARTNER_ID/customers/transfer" \
  -H "Authorization: $ADMIN_TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"customerUserId\":$MANUAL_C_USER_ID,\"reason\":\"端到端验收：手动绑定未归属客户\"}")
TRANSFER_RELATION_ID=$(echo "$TRANSFER_RESULT" | json_get data.relationId)
if [ -z "$TRANSFER_RELATION_ID" ]; then
  err "手动调整客户归属失败"
  exit 1
fi

MANUAL_RELATION_ID=$(psql_db "select id from \"CustomerRelation\" where \"partnerId\"=$PARTNER_ID and \"customerUserId\"=$MANUAL_C_USER_ID and status=1 limit 1;")
if [ -z "$MANUAL_RELATION_ID" ]; then
  err "手动调整后未生成有效 CustomerRelation"
  exit 1
fi

USED_COUNT=$(psql_db "select \"usedCount\" from \"InvitationCode\" where code='$INVITE_CODE';")
log "验收通过：inviteCode=${INVITE_CODE} usedCount=${USED_COUNT} invitedCustomerUserId=${C_USER_ID} manualCustomerUserId=${MANUAL_C_USER_ID}"
