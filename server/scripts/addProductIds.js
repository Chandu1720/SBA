const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const Product = require('../models/Product');
const { getNextSequence } = require('../utils/numberGenerator');

const MONGO_URI = process.env.MONGO_URI;

const addProductIds = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB connected for script');

    // Find products without product_id
    const productsToUpdate = await Product.find({ product_id: { $exists: false } });

    if (productsToUpdate.length === 0) {
      console.log('All products already have a product_id.');
      await mongoose.disconnect();
      return;
    }

    console.log(`Found ${productsToUpdate.length} products without product_id.`);

    for (const product of productsToUpdate) {
      try {
        const productId = await getNextSequence('product');
        product.product_id = productId;
        await product.save();
        console.log(`Updated product "${product.name}" (${product._id}) with product_id: ${productId}`);
      } catch (error) {
        console.error(`Error updating product ${product._id}:`, error.message);
      }
    }

    console.log('Finished updating products.');

  } catch (error) {
    console.error('Error updating products:', error);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB disconnected');
  }
};

addProductIds();
