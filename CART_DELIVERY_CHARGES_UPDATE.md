# Cart Delivery Charges Update

## Change Summary

Updated the cart delivery charges calculation from a flat rate to **₹99 per product/item**.

## Previous Logic
- **Old:** Flat ₹99 if subtotal ≤ ₹3000, free if subtotal > ₹3000
- Formula: `shipping_cost = subtotal > 3000 ? 0 : 99`

## New Logic
- **New:** ₹99 per product/item in the cart
- Formula: `shipping_cost = number_of_products × 99`

## Examples

### Example 1: 1 Product
- Products: 1
- Delivery Charges: ₹99 × 1 = **₹99**

### Example 2: 3 Products
- Products: 3
- Delivery Charges: ₹99 × 3 = **₹297**

### Example 3: 5 Products
- Products: 5
- Delivery Charges: ₹99 × 5 = **₹495**

### Example 4: Empty Cart
- Products: 0
- Delivery Charges: ₹99 × 0 = **₹0**

## Functions Updated

All cart operations now use the new delivery charge calculation:

1. **`createCart`** - When creating/updating cart with multiple products
2. **`addItemToCart`** - When adding a new item to cart
3. **`updateQuantity`** - When updating item quantity
4. **`deleteItem`** - When removing an item from cart
5. **`upsertCart`** - When upserting items in cart

## Implementation Details

```javascript
// Calculate Shipping Cost: ₹99 per product/item
const deliveryChargePerItem = 99;
const shipping_cost = cart.products.length * deliveryChargePerItem;
```

## Notes

- Delivery charges are calculated based on the **number of unique products** in the cart (not quantity)
- Each product/item adds ₹99 regardless of product price
- If cart is empty, delivery charges = ₹0
- Delivery charges are recalculated automatically when:
  - Items are added
  - Items are removed
  - Item quantities are updated
  - Cart is cleared

## Testing

To test the new delivery charges:
1. Add 1 product → Delivery should be ₹99
2. Add 2 more products → Delivery should be ₹297 (3 × ₹99)
3. Remove 1 product → Delivery should be ₹198 (2 × ₹99)
4. Clear cart → Delivery should be ₹0
