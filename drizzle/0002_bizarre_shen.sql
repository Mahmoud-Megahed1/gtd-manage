CREATE TABLE `attendance` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employeeId` int NOT NULL,
	`date` timestamp NOT NULL,
	`checkIn` timestamp,
	`checkOut` timestamp,
	`hoursWorked` int,
	`status` enum('present','absent','late','half_day') NOT NULL DEFAULT 'present',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `attendance_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `employees` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`employeeNumber` varchar(50) NOT NULL,
	`department` varchar(100),
	`position` varchar(100),
	`hireDate` timestamp NOT NULL,
	`salary` int,
	`bankAccount` varchar(100),
	`emergencyContact` text,
	`status` enum('active','on_leave','terminated') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `employees_id` PRIMARY KEY(`id`),
	CONSTRAINT `employees_userId_unique` UNIQUE(`userId`),
	CONSTRAINT `employees_employeeNumber_unique` UNIQUE(`employeeNumber`)
);
--> statement-breakpoint
CREATE TABLE `leaves` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employeeId` int NOT NULL,
	`leaveType` enum('annual','sick','emergency','unpaid') NOT NULL,
	`startDate` timestamp NOT NULL,
	`endDate` timestamp NOT NULL,
	`days` int NOT NULL,
	`reason` text,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`approvedBy` int,
	`approvedAt` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `leaves_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payroll` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employeeId` int NOT NULL,
	`month` int NOT NULL,
	`year` int NOT NULL,
	`baseSalary` int NOT NULL,
	`bonuses` int DEFAULT 0,
	`deductions` int DEFAULT 0,
	`netSalary` int NOT NULL,
	`paymentDate` timestamp,
	`status` enum('pending','paid') NOT NULL DEFAULT 'pending',
	`notes` text,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `payroll_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `performanceReviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employeeId` int NOT NULL,
	`reviewerId` int NOT NULL,
	`reviewDate` timestamp NOT NULL,
	`period` varchar(50),
	`rating` int,
	`strengths` text,
	`weaknesses` text,
	`goals` text,
	`comments` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `performanceReviews_id` PRIMARY KEY(`id`)
);
