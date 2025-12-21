-- AI Gemini Pages table migration
-- Created: 2025-12-21

CREATE TABLE IF NOT EXISTS `aiGeminiPages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `pageUrl` varchar(1000) NOT NULL COMMENT 'رابط صفحة Gemini',
  `apiKeyHash` varchar(255) DEFAULT NULL COMMENT 'hash لمفتاح API للتحقق',
  `isHidden` tinyint NOT NULL DEFAULT '0' COMMENT 'حالة الإخفاء',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `aiGeminiPages_userId_unique` (`userId`),
  KEY `idx_aiGeminiPages_isHidden` (`isHidden`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
