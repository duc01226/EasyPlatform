import { animate, state, style, transition, trigger } from '@angular/animations';
import { Component, NgZone } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { TranslateService } from '@ngx-translate/core';
import { Toast, ToastPackage, ToastrService } from 'ngx-toastr';

@Component({
    selector: '[toast-component]',
    template: `
        <button *ngIf="options.closeButton" (click)="remove()" type="button" class="toast-close-button" aria-label="Close">
            <span aria-hidden="true">&times;</span>
        </button>
        <div *ngIf="title" [class]="options.titleClass" [attr.aria-label]="title">
            {{ getTranslatedText(title) }}
            <ng-container *ngIf="duplicatesCount">[{{ duplicatesCount + 1 }}]</ng-container>
        </div>
        <div *ngIf="message && options.enableHtml" role="alert" [class]="options.messageClass" [innerHTML]="getSafeHtml(message)"></div>
        <div *ngIf="message && !options.enableHtml" role="alert" [class]="options.messageClass" [attr.aria-label]="message">
            {{ getTranslatedText(message) }}
        </div>
        <div *ngIf="options.progressBar">
            <div class="toast-progress" [style.width]="width + '%'"></div>
        </div>
    `,
    animations: [
        trigger('flyInOut', [
            state('inactive', style({ opacity: 0 })),
            state('active', style({ opacity: 1 })),
            state('removed', style({ opacity: 0 })),
            transition('inactive => active', animate('{{ easeTime }}ms {{ easing }}')),
            transition('active => removed', animate('{{ easeTime }}ms {{ easing }}'))
        ])
    ],
    preserveWhitespaces: false
})
export class PlatformTranslatedToastComponent extends Toast {
    constructor(
        private sanitizer: DomSanitizer,
        private translateService: TranslateService,
        toastrService: ToastrService,
        toastPackage: ToastPackage,
        ngZone?: NgZone
    ) {
        super(toastrService, toastPackage, ngZone);
    }

    getSafeHtml(text: string | SafeHtml): SafeHtml {
        if (!text) return '';

        const textStr = typeof text === 'string' ? text : text.toString();
        // Translate the text and then make it safe HTML
        const translated = this.translateService.instant(textStr);
        return this.sanitizer.bypassSecurityTrustHtml(translated);
    }

    getTranslatedText(text: string | SafeHtml): string {
        if (!text) return '';

        const textStr = typeof text === 'string' ? text : text.toString();
        return this.translateService.instant(textStr);
    }
}
