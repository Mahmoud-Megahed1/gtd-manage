ALTER TABLE purchases MODIFY COLUMN paymentMethod ENUM('cash', 'bank_transfer', 'check', 'credit', 'tamara', 'mispay', 'visa', 'mada', 'stcpay', 'pos') NOT NULL DEFAULT 'cash';
