CREATE TABLE `purchases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`purchaseNumber` varchar(50) NOT NULL,
	`supplierId` int,
	`supplierName` varchar(255) NOT NULL,
	`projectId` int,
	`description` text NOT NULL,
	`amount` int NOT NULL,
	`paymentMethod` enum('cash','bank_transfer','check','credit') NOT NULL DEFAULT 'cash',
	`purchaseDate` timestamp NOT NULL,
	`status` enum('pending','completed','cancelled') NOT NULL DEFAULT 'pending',
	`category` varchar(100),
	`notes` text,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `purchases_id` PRIMARY KEY(`id`),
	CONSTRAINT `purchases_purchaseNumber_unique` UNIQUE(`purchaseNumber`)
);
--> statement-breakpoint
CREATE TABLE `sales` (
	`id` int AUTO_INCREMENT NOT NULL,
	`saleNumber` varchar(50) NOT NULL,
	`clientId` int NOT NULL,
	`projectId` int,
	`description` text NOT NULL,
	`amount` int NOT NULL,
	`paymentMethod` enum('cash','bank_transfer','check','credit') NOT NULL DEFAULT 'cash',
	`saleDate` timestamp NOT NULL,
	`status` enum('pending','completed','cancelled') NOT NULL DEFAULT 'pending',
	`invoiceId` int,
	`notes` text,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sales_id` PRIMARY KEY(`id`),
	CONSTRAINT `sales_saleNumber_unique` UNIQUE(`saleNumber`)
);
