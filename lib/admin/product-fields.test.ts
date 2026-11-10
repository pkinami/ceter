import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PRODUCT_IMPORT_COLUMNS, parseProductInteger, parseProductItemType, parseProductUnit, productItemTypeLabel } from "@/lib/admin/product-fields";
import { readFirstWorksheet } from "@/lib/xlsx";

describe("product inventory fields", () => {
  it("accepts the same type and unit values used by the manual form and workbook", () => {
    assert.equal(parseProductItemType("product"), "product");
    assert.equal(parseProductItemType("raw_material"), "raw_material");
    assert.equal(parseProductUnit("pcs"), "pcs");
    assert.equal(parseProductUnit("box"), "box");
  });

  it("rejects missing and unsupported values without guessing", () => {
    assert.equal(parseProductItemType(""), null);
    assert.equal(parseProductItemType("service"), null);
    assert.equal(parseProductUnit("dozen"), null);
    assert.equal(parseProductUnit(undefined), null);
    assert.equal(productItemTypeLabel(null), "Unclassified");
  });

  it("ships a product import template with the shared fields", () => {
    const workbook = readFirstWorksheet(readFileSync("public/templates/ceter-products-import-template.xlsx"));
    assert.deepEqual(workbook[0], [...PRODUCT_IMPORT_COLUMNS]);
    assert.equal(PRODUCT_IMPORT_COLUMNS.length, 22);
  });

  it("uses safe non-negative whole numbers for manual and imported product values", () => {
    assert.equal(parseProductInteger("0"), 0);
    assert.equal(parseProductInteger("12"), 12);
    assert.equal(parseProductInteger(""), null);
    assert.equal(parseProductInteger("", true), null);
    assert.equal(parseProductInteger("-1"), null);
    assert.equal(parseProductInteger("1.5"), null);
    assert.equal(parseProductInteger("9007199254740992"), null);
  });
});
