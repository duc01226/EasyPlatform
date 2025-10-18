/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-types */
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Optional } from '@angular/core';

import { Observable, OperatorFunction, asyncScheduler } from 'rxjs';
import { delay, timeout } from 'rxjs/operators';

import { FormHelpers } from '../../helpers';
import { PLATFORM_CORE_GLOBAL_ENV } from '../../platform-core-global-environment';
import { PlatformCoreModuleConfig } from '../../platform-core.config';
import { clone, immutableUpdate, keys, toPlainObj } from '../../utils';
import { HttpClientOptions } from './platform.http-client-options';

export const STRESS_TEST_SIMULATION_LOCAL_STORAGE_KEY = 'STRESS_TEST_SIMULATION_LOCAL_STORAGE_KEY';

export abstract class PlatformHttpService {
    public DEFAULT_TIMEOUT_SECONDS = 3600 * 24;

    public constructor(
        @Optional() protected moduleConfig: PlatformCoreModuleConfig,
        protected http: HttpClient
    ) {}

    protected get requestTimeoutInMs(): number {
        return (this.moduleConfig?.httpRequestTimeoutInSeconds ?? this.DEFAULT_TIMEOUT_SECONDS) * 1000;
    }

    protected get defaultOptions(): HttpClientOptions {
        return {
            headers: {
                Accept: 'application/json, text/plain, */*',
                'Content-Type': 'application/json'
            }
        };
    }

    protected abstract appendAdditionalHttpOptions(options: HttpClientOptions): HttpClientOptions;

    protected httpGet<T>(url: string, options?: HttpClientOptions | (() => HttpClientOptions)): Observable<T> {
        const finalOptions = this.getFinalOptions(options);

        // Handle stress test simulation
        const stressTestValue = localStorage.getItem(STRESS_TEST_SIMULATION_LOCAL_STORAGE_KEY);
        if (stressTestValue == null) localStorage.setItem(STRESS_TEST_SIMULATION_LOCAL_STORAGE_KEY, '0');
        else {
            setTimeout(() => {
                const stressTestValueCount = Number.parseInt(stressTestValue);
                if (stressTestValueCount > 0)
                    console.warn(
                        `Stress Test Spam Api ${STRESS_TEST_SIMULATION_LOCAL_STORAGE_KEY} times is running (Deactivate by set to 0 ${STRESS_TEST_SIMULATION_LOCAL_STORAGE_KEY} item in local storage) for ` +
                            url
                    );

                for (let index = 0; index < stressTestValueCount; index++) {
                    this.http.get(url, <any>finalOptions).subscribe();
                }
            });
        }

        const timeoutMs = finalOptions.timeoutSeconds != null ? finalOptions.timeoutSeconds * 1000 : null;
        return this.http
            .get(url, <any>finalOptions)
            .pipe(
                <OperatorFunction<Object, T>>timeout(timeoutMs ?? this.requestTimeoutInMs),
                delay(PLATFORM_CORE_GLOBAL_ENV.isLocalDev ? PLATFORM_CORE_GLOBAL_ENV.localDevApiDelayMilliseconds() : 0, asyncScheduler)
            );
    }

    protected httpPost<TResult>(url: string, body: object, options?: HttpClientOptions | (() => HttpClientOptions)) {
        const finalOptions = this.getFinalOptions(options);
        const finalBody = this.buildHttpBody(body, finalOptions);
        return this.http
            .post(url, finalBody, <any>finalOptions)
            .pipe(
                <OperatorFunction<Object, TResult>>timeout(finalOptions.timeoutSeconds != null ? finalOptions.timeoutSeconds * 1000 : this.requestTimeoutInMs),
                delay(PLATFORM_CORE_GLOBAL_ENV.isLocalDev ? PLATFORM_CORE_GLOBAL_ENV.localDevApiDelayMilliseconds() : 0, asyncScheduler)
            );
    }

    protected httpPostFileMultiPartForm<TResult>(url: string, body: object, options?: HttpClientOptions | (() => HttpClientOptions)) {
        const finalBody = FormHelpers.convertModelToFormData(body);
        const finalOptions = immutableUpdate(this.getFinalOptions(options), {
            headers: {
                enctype: 'multipart/form-data'
            }
        });
        // The headers ContentType should be undefined, in order to add the correct boundaries
        delete (<any>finalOptions.headers)['Content-Type'];

        return this.http
            .post(url, finalBody, <any>finalOptions)
            .pipe(
                <OperatorFunction<Object, TResult>>timeout(finalOptions.timeoutSeconds != null ? finalOptions.timeoutSeconds * 1000 : this.requestTimeoutInMs),
                delay(PLATFORM_CORE_GLOBAL_ENV.isLocalDev ? PLATFORM_CORE_GLOBAL_ENV.localDevApiDelayMilliseconds() : 0, asyncScheduler)
            );
    }

    protected httpPut<T>(url: string, body: T, options?: HttpClientOptions | (() => HttpClientOptions)) {
        const finalOptions = this.getFinalOptions(options);
        const finalBody = this.buildHttpBody(body, finalOptions);
        return this.http
            .put(url, finalBody, <any>finalOptions)
            .pipe(
                <OperatorFunction<Object, T>>timeout(finalOptions.timeoutSeconds != null ? finalOptions.timeoutSeconds * 1000 : this.requestTimeoutInMs),
                delay(PLATFORM_CORE_GLOBAL_ENV.isLocalDev ? PLATFORM_CORE_GLOBAL_ENV.localDevApiDelayMilliseconds() : 0, asyncScheduler)
            );
    }

    protected httpDelete<T>(url: string, options?: HttpClientOptions | (() => HttpClientOptions)) {
        const finalOptions = this.getFinalOptions(options);
        return this.http
            .delete(url, <any>finalOptions)
            .pipe(
                <OperatorFunction<Object, T>>timeout(finalOptions.timeoutSeconds != null ? finalOptions.timeoutSeconds * 1000 : this.requestTimeoutInMs),
                delay(PLATFORM_CORE_GLOBAL_ENV.isLocalDev ? PLATFORM_CORE_GLOBAL_ENV.localDevApiDelayMilliseconds() : 0, asyncScheduler)
            );
    }

    protected buildHttpBody<T>(body: T, options: HttpClientOptions | (() => HttpClientOptions)) {
        const finalOptions = this.getFinalOptions(options);
        if (finalOptions.headers == undefined) return body;

        const headerContentType = finalOptions.headers instanceof HttpHeaders ? finalOptions.headers.get('Content-type') : finalOptions.headers['Content-type'];

        if (headerContentType == 'application/x-www-form-urlencoded') return this.buildUrlEncodedFormData(body);

        if (headerContentType == 'application/json') return JSON.stringify(toPlainObj(body));

        return body;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    protected buildUrlEncodedFormData(data: any): string {
        const formData = new URLSearchParams();
        if (data == undefined) return '';
        if (typeof data == 'object') {
            keys(data).forEach(key => formData.append(key, data[key]));
        } else {
            formData.append('value', data);
        }
        return formData.toString();
    }

    protected getFinalOptions(options?: HttpClientOptions | (() => HttpClientOptions)): HttpClientOptions {
        const finalOptions = options == undefined ? {} : typeof options == 'function' ? options() : options;

        return immutableUpdate(clone(this.defaultOptions), this.appendAdditionalHttpOptions(finalOptions) ?? finalOptions);
    }
}

export const ErrorCodeConstant: Record<string, number> = {
    RequestCanceller: 0,
    NotModified: 304,
    // Client error codes with 4**
    BadRequest: 400,
    Unauthorized: 401,
    PaymentRequired: 402,
    Forbidden: 403,
    NotFound: 404,
    MethodNotAllowed: 405,
    RequestTimeout: 408,
    PreconditionFailed: 412,
    LoginTimeout: 440,
    UnprocessableEntity: 422,
    // Server error codes with 5**
    InternalServerError: 500,
    NotImplemented: 501,
    GatewayTimeout: 504,
    NetworkConnectTimeout: 599
};
