-- Add affiliate_url and image_url columns to products table
-- Run in Supabase SQL Editor

ALTER TABLE products ADD COLUMN IF NOT EXISTS affiliate_url TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Seed all 18 products with Amazon affiliate URLs
-- INK INK (listing_id 786) products
UPDATE products SET affiliate_url = 'https://www.amazon.com/dp/B0CZS6VL6P?tag=hairtattoo-20' WHERE id = 'd3868b8d-38da-4180-8a2c-37cbf7994e07';
UPDATE products SET affiliate_url = 'https://www.amazon.com/dp/B0B9CCMTDK?tag=hairtattoo-20' WHERE id = '7f35ee4b-84a0-4750-8530-bbe699a59cff';
UPDATE products SET affiliate_url = 'https://www.amazon.com/dp/B08LK453GK?tag=hairtattoo-20' WHERE id = '49cb3f3d-ce13-45c9-82b6-aca50263441c';
UPDATE products SET affiliate_url = 'https://www.amazon.com/dp/B07VFCWTHJ?tag=hairtattoo-20' WHERE id = 'a467f4a8-8947-4641-82de-b1a19e6f8be6';
UPDATE products SET affiliate_url = 'https://www.amazon.com/dp/B0796TGRT7?tag=hairtattoo-20' WHERE id = 'e84dff8b-5872-4c6c-be0b-c1ee298b9041';
UPDATE products SET affiliate_url = 'https://www.amazon.com/dp/B0DTJ7PJX2?tag=hairtattoo-20' WHERE id = '916fdc2b-a8fb-476f-8d42-de30186c91dc';
UPDATE products SET affiliate_url = 'https://www.amazon.com/dp/B0DTJ7PJX2?tag=hairtattoo-20' WHERE id = '90bfa7fa-b291-4fbf-8c08-72fc1720e01c';
UPDATE products SET affiliate_url = 'https://www.amazon.com/dp/B0932NLL6C?tag=hairtattoo-20' WHERE id = '61ad7945-71e5-4279-a1a3-5c5497fd6d5b';
UPDATE products SET affiliate_url = 'https://www.amazon.com/dp/B0932NLL6C?tag=hairtattoo-20' WHERE id = '2d2dbf4d-0c2e-4b92-b98f-a24ad394ff16';
UPDATE products SET affiliate_url = 'https://www.amazon.com/dp/B093B45V27?tag=hairtattoo-20' WHERE id = '89d17ff8-413e-4faa-aee4-26e629e57519';

-- SMP BARBER INK (listing_id 846) products
UPDATE products SET affiliate_url = 'https://www.amazon.com/dp/B0CZS6VL6P?tag=hairtattoo-20' WHERE id = '307dcd6f-3d60-43fd-a456-ea0b988cb7bb';
UPDATE products SET affiliate_url = 'https://www.amazon.com/dp/B093B45V27?tag=hairtattoo-20' WHERE id = '629dff93-c586-47a4-a702-79ff741173c3';
UPDATE products SET affiliate_url = 'https://www.amazon.com/dp/B0C8NHRPFY?tag=hairtattoo-20' WHERE id = 'cd9a2977-7ba6-4ec0-93c8-01baa33b15ad';
UPDATE products SET affiliate_url = 'https://www.amazon.com/dp/B0C8NHRPFY?tag=hairtattoo-20' WHERE id = '943f270a-525e-44dc-940c-e593c7a7a1cf';
UPDATE products SET affiliate_url = 'https://www.amazon.com/dp/B0DTJ7PJX2?tag=hairtattoo-20' WHERE id = '078622cb-e0a7-4840-be21-0a3e64faf054';
UPDATE products SET affiliate_url = 'https://www.amazon.com/dp/B06XKVBCTT?tag=hairtattoo-20' WHERE id = 'a7120d93-cc7b-4888-8e8c-ec1129746da6';
UPDATE products SET affiliate_url = 'https://www.amazon.com/dp/B07Y68P684?tag=hairtattoo-20' WHERE id = '3354fe1a-0365-48c4-b7f2-2ff233252076';
UPDATE products SET affiliate_url = 'https://www.amazon.com/dp/B07F1RMQ8Q?tag=hairtattoo-20' WHERE id = '0b8f7d1e-c0ac-486a-9699-efbab8f5d39d';
