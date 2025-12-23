import React, { useEffect, useRef } from 'react';

interface BarcodeProps {
    value: string;
    width?: number;
    height?: number;
}

export const Barcode: React.FC<BarcodeProps> = ({ value, width = 2, height = 100 }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (!canvasRef.current || !value) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Simple Code 39 Implementation for Alphanumeric
        const code39: Record<string, string> = {
            '0': '111221211', '1': '211211112', '2': '112211112', '3': '212211111', '4': '111221112',
            '5': '211221111', '6': '112221111', '7': '111211212', '8': '211211211', '9': '112211211',
            'A': '211112112', 'B': '112112112', 'C': '212112111', 'D': '111122112', 'E': '211122111',
            'F': '112122111', 'G': '111112212', 'H': '211112211', 'I': '112112211', 'J': '111122211',
            'K': '211111122', 'L': '112111122', 'M': '212111121', 'N': '111121122', 'O': '211121121',
            'P': '112121121', 'Q': '111111222', 'R': '211111221', 'S': '112111221', 'T': '111121221',
            'U': '221111112', 'V': '122111112', 'W': '222111111', 'X': '121121112', 'Y': '221121111',
            'Z': '122121111', '-': '121111212', '.': '221111211', ' ': '122111211', '*': '121121211',
            '$': '121212111', '/': '121211121', '+': '121112121', '%': '111212121'
        };

        const drawBarcode = () => {
            // Add start/stop characters
            const enc = '*' + value.toUpperCase().replace(/[^A-Z0-9\-. $/+%]/g, '') + '*';

            // Calculate total width
            let totalModules = 0;
            for (let i = 0; i < enc.length; i++) {
                const charCode = code39[enc[i]] || '121121211'; // Default to * if unknown
                for (const c of charCode) totalModules += parseInt(c);
                totalModules += 1; // Inter-character gap
            }

            canvas.width = totalModules * width + 20; // Padding
            canvas.height = height;

            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#000000';

            let x = 10;
            for (let i = 0; i < enc.length; i++) {
                const char = enc[i];
                const pattern = code39[char] || code39['*'];

                for (let j = 0; j < 9; j++) {
                    const w = parseInt(pattern[j]) * width;
                    const isBar = j % 2 === 0; // Bars are at even indices (0, 2, 4...)
                    if (isBar) {
                        ctx.fillRect(x, 0, w, height);
                    }
                    x += w;
                }
                x += width; // Gap between characters
            }
        };

        drawBarcode();

    }, [value, width, height]);

    return <canvas ref={canvasRef} style={{ maxWidth: '100%', maxHeight: '100%' }} />;
};
