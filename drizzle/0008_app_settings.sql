CREATE TABLE `appSettings` (
	`key` varchar(100) NOT NULL,
	`value` text NOT NULL,
	`updatedBy` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	PRIMARY KEY (`key`)
);
