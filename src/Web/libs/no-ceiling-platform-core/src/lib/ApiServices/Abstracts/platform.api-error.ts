import { HttpStatusCode } from '@angular/common/http';

export interface IPlatformApiServiceErrorResponse {
  error: IPlatformApiServiceErrorInfo;
  statusCode?: HttpStatusCode;
}

export class PlatformApiServiceErrorResponse {
  public constructor(data?: IPlatformApiServiceErrorResponse) {
    if (data != null) {
      if (data.error != null) this.error = new PlatformApiServiceErrorInfo(data.error);
      if (data.statusCode != null) this.statusCode = data.statusCode;
    }
  }

  public error: PlatformApiServiceErrorInfo = new PlatformApiServiceErrorInfo();
  public statusCode?: HttpStatusCode;
}

export interface IPlatformApiServiceErrorInfo {
  code: PlatformApiServiceErrorInfoCode | string;
  message?: string;
  formattedMessagePlaceholderValues?: Map<string, string>;
  target?: string;
  details?: IPlatformApiServiceErrorInfo[];
}

export class PlatformApiServiceErrorInfo implements IPlatformApiServiceErrorInfo {
  public constructor(data?: Partial<IPlatformApiServiceErrorInfo>) {
    if (data != null) {
      if (data.code != null) this.code = data.code;
      if (data.message != null) this.message = data.message;
      if (data.formattedMessagePlaceholderValues != null) this.formattedMessagePlaceholderValues = data.formattedMessagePlaceholderValues;
      if (data.target != null) this.target = data.target;
      if (data.details != null) this.details = data.details.map(p => new PlatformApiServiceErrorInfo(p));
    }
  }

  public code: PlatformApiServiceErrorInfoCode | string = '';

  public message?: string;

  public formattedMessagePlaceholderValues?: Map<string, string>;

  public target?: string;

  public details?: IPlatformApiServiceErrorInfo[];
}

export enum PlatformApiServiceErrorInfoCode {
  InternalServerException = 'InternalServerException',
  PlatformApplicationException = 'PlatformApplicationException',
  PlatformApplicationValidationException = 'PlatformApplicationValidationException',
  ConnectionRefused = 'ConnectionRefused',
  TimeoutError = 'TimeoutError',
  Unknown = 'Unknown'
}
