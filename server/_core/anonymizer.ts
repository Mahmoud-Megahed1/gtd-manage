/*
 © 2025 - Property of [Mohammed Ahmed / Golden Touch Design co.]
 Unauthorized use or reproduction is prohibited.
*/

/**
 * Anonymizer class to mask sensitive data before sending to AI
 */
export class Anonymizer {
    private patterns: Record<string, RegExp>;

    constructor() {
        // Define sensitive patterns
        this.patterns = {
            // 1. Phone Numbers (Saudi & International)
            // Matches: +9665..., 05..., 009665...
            phone: /(?:\+966|00966|966|0)?5\d{8}/g,

            // 2. Email Addresses
            email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,

            // 3. National ID / Iqama (10 digits starting with 1 or 2)
            nationalID: /\b[12]\d{9}\b/g,

            // 4. Saudi IBAN (SA + 22 digits)
            iban: /SA\d{22}/gi,

            // 5. Credit Cards (16 digits with optional spaces/dashes)
            creditCard: /\b\d{4}[ -]?\d{4}[ -]?\d{4}[ -]?\d{4}\b/g,

            // 6. Monetary Amounts (digits followed by currency keywords)
            // Matches: 1000 ريال, 500 SAR, etc.
            money: /\b\d{1,3}(?:,\d{3})*(?:\.\d+)?\s*(ريال|SAR|RS|جنيه|دولار|USD)\b/gi,
        };
    }

    /**
     * Mask sensitive information in text
     * @param text Original text
     * @param customNames Optional list of names to mask
     * @returns Masked text
     */
    mask(text: string, customNames: string[] = []): string {
        if (!text) return "";

        let maskedText = text;

        // 1. Apply regex masks
        maskedText = maskedText.replace(this.patterns.phone, " [رقم_هاتف] ");
        maskedText = maskedText.replace(this.patterns.email, " [بريد_إلكتروني] ");
        maskedText = maskedText.replace(this.patterns.nationalID, " [رقم_هوية] ");
        maskedText = maskedText.replace(this.patterns.iban, " [رقم_آيبان] ");
        maskedText = maskedText.replace(this.patterns.creditCard, " [بطاقة_ائتمان] ");
        maskedText = maskedText.replace(this.patterns.money, " [مبلغ_مالي] ");

        // 2. Mask custom names (case insensitive)
        if (customNames && customNames.length > 0) {
            // Sort by length desc to mask longer names first (avoid partial sub-matches)
            // e.g. "Mohammed Ahmed" before "Mohammed"
            const sortedNames = [...customNames].sort((a, b) => b.length - a.length);

            sortedNames.forEach(name => {
                if (name && name.length > 2) { // Only mask names longer than 2 chars
                    // Escape regex special characters in name
                    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const nameRegex = new RegExp(escapedName, 'gi');
                    maskedText = maskedText.replace(nameRegex, " [اسم_شخص] ");
                }
            });
        }

        return maskedText;
    }
}

// Export singleton instance
export const anonymizer = new Anonymizer();
