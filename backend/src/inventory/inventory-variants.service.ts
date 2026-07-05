import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InventoryProductStatus } from '@velon/database';
import { canManageInventory, canReadInventory, normalizeVelonRole } from '@velon/shared';
import type { AuthenticatedUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import type { ProductVariantAttributeInputDto, ProductVariantInputDto } from './dto/inventory.dto';
import {
  InventoryVariantAttributeRepository,
  InventoryVariantRepository,
} from './inventory-variants.repositories';
import { buildVariantLabel, effectiveVariantPrice } from './inventory-variants.util';
import { InventoryProductRepository, InventoryStockRepository } from './inventory.repositories';

type VariantStockInput = {
  warehouseId?: string;
  quantity?: number;
  minStock?: number;
  reorderLevel?: number;
};

@Injectable()
export class InventoryVariantsService {
  constructor(
    private readonly products: InventoryProductRepository,
    private readonly variants: InventoryVariantRepository,
    private readonly attributes: InventoryVariantAttributeRepository,
    private readonly stock: InventoryStockRepository,
    private readonly prisma: PrismaService,
  ) {}

  private role(user: AuthenticatedUser) {
    return normalizeVelonRole(user.role);
  }

  private assertRead(user: AuthenticatedUser) {
    if (!canReadInventory(this.role(user))) {
      throw new ForbiddenException('Inventory access denied.');
    }
  }

  private assertManage(user: AuthenticatedUser) {
    if (!canManageInventory(this.role(user))) {
      throw new ForbiddenException('Insufficient permissions to manage inventory.');
    }
  }

  mapVariant(row: {
    id: string;
    label: string;
    sku: string;
    barcode: string | null;
    unitPrice: { toNumber(): number };
    costPrice: { toNumber(): number };
    salePrice: { toNumber(): number } | null;
    imageDataUrl: string | null;
    status: InventoryProductStatus;
    sortOrder: number;
    options?: Array<{
      attributeValue: { id: string; value: string; attribute: { id: string; name: string } };
    }>;
    stock?: Array<{
      id: string;
      quantity: number;
      reservedQty: number;
      minStock: number;
      reorderLevel: number;
      warehouseId: string;
      warehouse: { name: string };
    }>;
  }) {
    const unitPrice = row.unitPrice.toNumber();
    const salePrice = row.salePrice?.toNumber() ?? null;
    const totalStock = (row.stock ?? []).reduce((s, st) => s + st.quantity - st.reservedQty, 0);
    return {
      id: row.id,
      label: row.label,
      sku: row.sku,
      barcode: row.barcode,
      unitPrice,
      costPrice: row.costPrice.toNumber(),
      salePrice,
      effectivePrice: effectiveVariantPrice(unitPrice, salePrice),
      imageDataUrl: row.imageDataUrl,
      status: row.status,
      sortOrder: row.sortOrder,
      totalStock,
      options: (row.options ?? []).map((o) => ({
        attributeId: o.attributeValue.attribute.id,
        attributeName: o.attributeValue.attribute.name,
        valueId: o.attributeValue.id,
        value: o.attributeValue.value,
      })),
      stock: (row.stock ?? []).map((st) => ({
        id: st.id,
        warehouseId: st.warehouseId,
        warehouseName: st.warehouse.name,
        quantity: st.quantity,
        available: st.quantity - st.reservedQty,
        minStock: st.minStock,
        reorderLevel: st.reorderLevel,
      })),
    };
  }

  async listVariantsForProduct(user: AuthenticatedUser, productId: string) {
    this.assertRead(user);
    const product = await this.products.findById(productId);
    if (!product) throw new NotFoundException('Product not found.');
    const rows = await this.variants.findByProduct(productId);
    return rows.map((r) => this.mapVariant(r));
  }

  async searchVariants(user: AuthenticatedUser, query?: string) {
    this.assertRead(user);
    const rows = await this.variants.search(query ?? '');
    return rows.map((r) => ({
      ...this.mapVariant(r),
      productId: r.product.id,
      productName: r.product.name,
      productImage: r.product.imageDataUrl,
    }));
  }

  async getProductWithVariants(user: AuthenticatedUser, productId: string) {
    this.assertRead(user);
    const product = await this.products.findById(productId);
    if (!product) throw new NotFoundException('Product not found.');

    const [attributeRows, variantRows, variantCount] = await Promise.all([
      this.attributes.findByProduct(productId),
      this.variants.findByProduct(productId),
      this.variants.countByProduct(productId),
    ]);

    return {
      ...product,
      variantCount,
      attributes: attributeRows.map((a) => ({
        id: a.id,
        name: a.name,
        sortOrder: a.sortOrder,
        values: a.values.map((v) => ({ id: v.id, value: v.value, sortOrder: v.sortOrder })),
      })),
      variants: variantRows.map((v) => this.mapVariant(v)),
    };
  }

  private validateAttributeInputs(attributes: ProductVariantAttributeInputDto[]) {
    if (!attributes.length) {
      throw new BadRequestException('Add at least one attribute when variants are enabled.');
    }
    for (const attr of attributes) {
      const name = attr.name?.trim();
      if (!name) throw new BadRequestException('Attribute name cannot be empty.');
      const values = (attr.values ?? []).map((v) => v.trim()).filter(Boolean);
      if (!values.length) {
        throw new BadRequestException(`Attribute "${name}" must have at least one value.`);
      }
    }
  }

  private async validateVariantInputs(
    variantInputs: ProductVariantInputDto[],
    tenantId: string,
    productId?: string,
  ) {
    if (!variantInputs.length) {
      throw new BadRequestException('Add at least one variant when variants are enabled.');
    }

    const skus = new Set<string>();
    const barcodes = new Set<string>();

    for (const v of variantInputs) {
      const sku = v.sku?.trim();
      if (!sku) throw new BadRequestException('Each variant must have a SKU.');
      if (skus.has(sku)) throw new BadRequestException(`Duplicate SKU in request: ${sku}`);
      skus.add(sku);

      const barcode = v.barcode?.trim();
      if (barcode) {
        if (barcodes.has(barcode)) {
          throw new BadRequestException(`Duplicate barcode in request: ${barcode}`);
        }
        barcodes.add(barcode);
      }

      if ((v.unitPrice ?? 0) < 0)
        throw new BadRequestException('Variant price cannot be negative.');
      if ((v.costPrice ?? 0) < 0) throw new BadRequestException('Variant cost cannot be negative.');
      if (v.salePrice != null && v.salePrice < 0) {
        throw new BadRequestException('Variant sale price cannot be negative.');
      }
      if ((v.quantity ?? 0) < 0) throw new BadRequestException('Variant stock cannot be negative.');
      if ((v.minStock ?? 0) < 0) {
        throw new BadRequestException('Variant low stock alert cannot be negative.');
      }

      const existingSku = await this.variants.findBySku(sku, v.id);
      if (existingSku) throw new BadRequestException(`SKU already exists: ${sku}`);

      const productSku = await this.products.findBySku(sku);
      if (productSku && productSku.id !== productId) {
        throw new BadRequestException(`SKU already exists on another product: ${sku}`);
      }

      if (barcode) {
        const existingBarcode = await this.variants.findByBarcode(barcode, v.id);
        if (existingBarcode) throw new BadRequestException(`Barcode already exists: ${barcode}`);

        const productBarcode = await this.prisma.client.inventoryProduct.findFirst({
          where: { tenantId, barcode },
        });
        if (productBarcode && productBarcode.id !== productId) {
          throw new BadRequestException(`Barcode already exists on another product: ${barcode}`);
        }
      }
    }
  }

  async saveVariantsForProduct(
    user: AuthenticatedUser,
    productId: string,
    hasVariants: boolean,
    attributeInputs: ProductVariantAttributeInputDto[] | undefined,
    variantInputs: ProductVariantInputDto[] | undefined,
    defaultWarehouseId?: string,
  ) {
    this.assertManage(user);
    const product = await this.products.findById(productId);
    if (!product) throw new NotFoundException('Product not found.');

    if (!hasVariants) {
      await this.clearVariants(productId);
      await this.products.update(productId, { hasVariants: false });
      return this.getProductWithVariants(user, productId);
    }

    const attrs = attributeInputs ?? [];
    const variants = variantInputs ?? [];
    this.validateAttributeInputs(attrs);
    await this.validateVariantInputs(variants, user.tenantId!, productId);

    await this.prisma.client.$transaction(async (tx) => {
      await tx.inventoryProductVariantOption.deleteMany({
        where: { variant: { productId, tenantId: user.tenantId } },
      });
      await tx.inventoryStock.deleteMany({
        where: { productId, tenantId: user.tenantId, variantId: { not: null } },
      });
      await tx.inventoryProductVariant.deleteMany({
        where: { productId, tenantId: user.tenantId },
      });
      await tx.inventoryProductVariantAttribute.deleteMany({
        where: { productId, tenantId: user.tenantId },
      });

      const attributeValueMap = new Map<string, string>();

      for (let ai = 0; ai < attrs.length; ai++) {
        const attrInput = attrs[ai]!;
        const attribute = await tx.inventoryProductVariantAttribute.create({
          data: {
            tenantId: user.tenantId!,
            productId,
            name: attrInput.name.trim(),
            sortOrder: ai,
          },
        });
        const values = attrInput.values.map((v) => v.trim()).filter(Boolean);
        for (let vi = 0; vi < values.length; vi++) {
          const val = await tx.inventoryProductVariantAttributeValue.create({
            data: {
              tenantId: user.tenantId!,
              attributeId: attribute.id,
              value: values[vi]!,
              sortOrder: vi,
            },
          });
          attributeValueMap.set(`${attrInput.name.trim()}::${values[vi]!}`, val.id);
        }
      }

      for (let vi = 0; vi < variants.length; vi++) {
        const v = variants[vi]!;
        const label =
          v.label?.trim() ||
          buildVariantLabel(
            (v.optionValues ?? []).map((ov) => ov.value?.trim() ?? '').filter(Boolean),
          );
        if (!label) throw new BadRequestException('Each variant must have a label.');

        const variant = await tx.inventoryProductVariant.create({
          data: {
            tenantId: user.tenantId!,
            productId,
            label,
            sku: v.sku.trim(),
            barcode: v.barcode?.trim() || null,
            unitPrice: v.unitPrice ?? 0,
            costPrice: v.costPrice ?? 0,
            salePrice: v.salePrice ?? null,
            imageDataUrl: v.imageDataUrl || null,
            status: v.status ?? InventoryProductStatus.ACTIVE,
            sortOrder: vi,
          },
        });

        const optionValueIds: string[] = [];
        for (const ov of v.optionValues ?? []) {
          const key = `${ov.attributeName?.trim()}::${ov.value?.trim()}`;
          const valueId = attributeValueMap.get(key);
          if (!valueId) {
            throw new BadRequestException(`Invalid option combination for variant "${label}".`);
          }
          optionValueIds.push(valueId);
        }

        if (optionValueIds.length) {
          await tx.inventoryProductVariantOption.createMany({
            data: optionValueIds.map((attributeValueId) => ({
              variantId: variant.id,
              attributeValueId,
            })),
          });
        }

        const warehouseId = v.warehouseId ?? defaultWarehouseId;
        if (warehouseId) {
          await tx.inventoryStock.create({
            data: {
              tenantId: user.tenantId!,
              productId,
              variantId: variant.id,
              warehouseId,
              quantity: v.quantity ?? 0,
              minStock: v.minStock ?? 0,
              reorderLevel: v.reorderLevel ?? 0,
            },
          });
        }
      }

      await tx.inventoryProduct.update({
        where: { id: productId },
        data: { hasVariants: true },
      });
    });

    return this.getProductWithVariants(user, productId);
  }

  private async clearVariants(productId: string) {
    await this.prisma.client.$transaction([
      this.prisma.client.inventoryStock.deleteMany({
        where: { productId, variantId: { not: null } },
      }),
      this.prisma.client.inventoryProductVariant.deleteMany({ where: { productId } }),
      this.prisma.client.inventoryProductVariantAttribute.deleteMany({ where: { productId } }),
    ]);
  }

  async deactivateVariant(user: AuthenticatedUser, variantId: string) {
    this.assertManage(user);
    const row = await this.variants.findById(variantId);
    if (!row) throw new NotFoundException('Variant not found.');
    await this.prisma.client.inventoryProductVariant.update({
      where: { id: variantId },
      data: { status: InventoryProductStatus.INACTIVE },
    });
    return { ok: true };
  }
}
