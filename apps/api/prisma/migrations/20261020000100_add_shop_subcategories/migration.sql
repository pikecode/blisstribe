ALTER TABLE "ShopCategory" ADD COLUMN "parentId" BIGINT;
ALTER TABLE "ShopCategory" ADD CONSTRAINT "ShopCategory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ShopCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ShopCategory" ADD CONSTRAINT "ShopCategory_parent_not_self" CHECK ("parentId" IS NULL OR "parentId" <> "id");
CREATE INDEX "ShopCategory_parentId_sortOrder_idx" ON "ShopCategory"("parentId", "sortOrder");

-- 串行检查分类归属，避免并发移动分类形成环或三级分类。
CREATE FUNCTION enforce_shop_category_depth() RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(20261020, 1);
  IF NEW."parentId" IS NOT NULL THEN
    IF NEW."parentId" = NEW.id OR EXISTS (SELECT 1 FROM "ShopCategory" WHERE id = NEW."parentId" AND "parentId" IS NOT NULL) THEN
      RAISE EXCEPTION '商城分类最多两级，父分类必须为一级分类' USING ERRCODE = '23514';
    END IF;
    IF EXISTS (SELECT 1 FROM "ShopCategory" WHERE "parentId" = NEW.id) THEN
      RAISE EXCEPTION '已有子分类的分类不能改为二级分类' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "ShopCategory_depth_guard" BEFORE INSERT OR UPDATE OF "parentId" ON "ShopCategory" FOR EACH ROW EXECUTE FUNCTION enforce_shop_category_depth();
