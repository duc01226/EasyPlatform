import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class HostService {
    constructor(@Inject(DOCUMENT) document: any) {
        this.document = document;
    }

    private document: Document;

    public get HostName(): string {
        return this.document.location.origin;
    }
}
