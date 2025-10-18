import { numberFormatLength } from './_common-functions';

export function number_round(value: number, factionDigits: number = 0): number {
    const floatPointMovingValue = Math.pow(10, factionDigits) * 1.0;
    return Math.round(value * floatPointMovingValue) / floatPointMovingValue;
}

export function number_toFixed(value: number, factionDigits: number = 0): string {
    return number_round(value, factionDigits).toFixed(factionDigits);
}

export function number_formatLength(num: number, length: number) {
    return numberFormatLength(num, length);
}

export function number_isInteger(value: unknown): value is number {
    return number_IsNumber(value) && Math.floor(value) === value;
}

export function number_range(start: number, end: number, step: number = 1): number[] {
    const length = Math.floor((end - start) / step) + 1;
    return Array(length)
        .fill(0)
        .map((_, idx) => start + idx * step);
}

export function number_IsNumber(value: unknown): value is number {
    const parsedValue = typeof value === 'string' ? Number(value) : value;
    return typeof parsedValue === 'number' && isFinite(parsedValue);
}
