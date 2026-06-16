import { apiClient } from './apiClient';

export interface InventoryCategory {
  id: number; uuid: string; categoryCode: string; categoryName: string;
  parentCategoryId?: number; description?: string; isActive: boolean;
  children?: InventoryCategory[];
}

export interface InventoryItem {
  id: number; uuid: string; itemCode: string; itemName: string;
  categoryId: number; description?: string; unitOfMeasure: string;
  reorderLevel: number; costPrice?: number; sellingPrice?: number; isActive: boolean;
  category?: InventoryCategory; totalStock?: number; isBelowReorderLevel?: boolean;
}

export interface Warehouse {
  id: number; uuid: string; warehouseCode: string; warehouseName: string;
  locationId: number; address?: string; city?: string; state?: string;
  country?: string; capacity?: number; isActive: boolean;
  managerUserId?: number; stockSummary?: { totalSkus: number; lowStockItems: number; totalQuantity: number };
}

export interface WarehouseStock {
  id?: number; warehouseId: number; inventoryItemId: number;
  quantity: number; reorderLevel: number; isBelowReorderLevel: boolean;
  item?: InventoryItem;
}

export interface WarehouseStats {
  total: number; active: number; lowStockItems: number;
}

export interface ItemListParams {
  page?: number; limit?: number; search?: string; categoryId?: number; isActive?: boolean;
}

export interface WarehouseListParams {
  page?: number; limit?: number; isActive?: boolean;
}

export const inventoryService = {
  getCategories: () => apiClient.get<InventoryCategory[]>('/inventory/categories'),

  createCategory: (payload: Partial<InventoryCategory> & { categoryName: string }) =>
    apiClient.post<InventoryCategory>('/inventory/categories', payload),

  updateCategory: (id: number | string, payload: Partial<InventoryCategory>) =>
    apiClient.put<InventoryCategory>(`/inventory/categories/${id}`, payload),

  deleteCategory: (id: number | string) => apiClient.delete<null>(`/inventory/categories/${id}`),

  getItems: (params: ItemListParams = {}) =>
    apiClient.getRaw('/inventory/items', params) as Promise<{
      data: InventoryItem[];
      pagination: { total: number; page: number; limit: number; totalPages: number };
    }>,

  getLowStockItems: () => apiClient.get<InventoryItem[]>('/inventory/items/low-stock'),

  getItemById: (id: number | string) => apiClient.get<InventoryItem>(`/inventory/items/${id}`),

  createItem: (payload: Partial<InventoryItem> & { itemCode: string; itemName: string; categoryId: number; unitOfMeasure: string; reorderLevel: number }) =>
    apiClient.post<InventoryItem>('/inventory/items', payload),

  updateItem: (id: number | string, payload: Partial<InventoryItem>) =>
    apiClient.put<InventoryItem>(`/inventory/items/${id}`, payload),

  deleteItem: (id: number | string) => apiClient.delete<null>(`/inventory/items/${id}`),

  getWarehouses: (params: WarehouseListParams = {}) =>
    apiClient.getRaw('/warehouse', params) as Promise<{
      data: Warehouse[];
      pagination: { total: number; page: number; limit: number; totalPages: number };
    }>,

  getWarehouseStats: () => apiClient.get<WarehouseStats>('/warehouse/stats/overview'),

  getWarehouseById: (id: number | string) => apiClient.get<Warehouse>(`/warehouse/${id}`),

  createWarehouse: (payload: Partial<Warehouse> & { warehouseCode: string; warehouseName: string; locationId: number }) =>
    apiClient.post<Warehouse>('/warehouse', payload),

  updateWarehouse: (id: number | string, payload: Partial<Warehouse>) =>
    apiClient.put<Warehouse>(`/warehouse/${id}`, payload),

  deleteWarehouse: (id: number | string) => apiClient.delete<null>(`/warehouse/${id}`),

  getWarehouseStock: (warehouseId: number | string) =>
    apiClient.get<WarehouseStock[]>(`/warehouse/${warehouseId}/stock`),

  updateWarehouseStock: (warehouseId: number | string, payload: { inventoryItemId: number; quantity: number; reorderLevel?: number }) =>
    apiClient.post<WarehouseStock>(`/warehouse/${warehouseId}/stock`, payload),
};
