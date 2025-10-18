export function any<T>(collection: ArrayLike<T> | undefined, predicate: (item: T) => boolean): boolean {
    if (collection == undefined) return false;
    for (let i = 0; i < collection.length; i++) {
        const element = collection[i]!;
        if (predicate(element)) return true;
    }
    return false;
}

export function numberFormatLength(num: number, length: number) {
    let r = '' + num;

    while (r.length < length) {
        r = '0' + r;
    }

    return r;
}
