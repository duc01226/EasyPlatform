/* eslint-disable @typescript-eslint/no-explicit-any */
import { AbstractControl, FormArray, FormGroup } from '@angular/forms';

export class FormHelpers {
    public static isFormValid(form: FormGroup): boolean {
        if (form.controls == null) {
            return form.valid;
        }

        Object.values(form.controls).forEach((control: AbstractControl) => {
            if (control.invalid) {
                control.markAsDirty();
                control.markAsTouched();
                control.updateValueAndValidity({ onlySelf: true });
            }

            if (control instanceof FormArray) control.controls.some((form: AbstractControl) => !FormHelpers.isFormValid(form as FormGroup));
        });

        return form.valid;
    }

    public static validateAllFormControls(form: FormGroup, markAsTouchedAndDirty: boolean = true): boolean {
        if (form.controls == null) {
            return form.valid;
        }

        Object.values(form.controls).forEach((control: AbstractControl) => {
            if (markAsTouchedAndDirty) {
                control.markAsDirty();
                control.markAsTouched();
            }
            control.updateValueAndValidity({ onlySelf: false });

            if (control instanceof FormArray)
                control.controls.some((form: AbstractControl) => !FormHelpers.validateAllFormControls(form as FormGroup, markAsTouchedAndDirty));
        });

        return form.valid;
    }

    public static convertModelToFormData(model: object, form: FormData | null = null, namespace: string = ''): FormData {
        const formData: FormData = form ?? new FormData();

        Object.keys(model).forEach(propertyName => {
            const modelValue = (<any>model)[propertyName];

            if (Object.prototype.hasOwnProperty.call(model, propertyName) == true && (<any>model)[propertyName] != undefined) {
                const formKey = namespace ? namespace + (propertyName ? '.' + propertyName : '') : propertyName.toString();

                if (modelValue instanceof Date) {
                    formData.append(formKey, modelValue.toISOString());
                } else if (modelValue instanceof Array) {
                    if (modelValue.length === 0) {
                        formData.append(formKey, '[]');
                    } else {
                        modelValue.forEach((element, index) => {
                            if (element instanceof File) {
                                formData.append(formKey, element, element.name);
                            } else {
                                const tempFormKey = `${formKey}[${index}]`;
                                // Recurse to handle complex objects or primitives within the array
                                this.convertModelToFormData({ '': element }, formData, tempFormKey);
                            }
                        });
                    }
                } else if (modelValue instanceof File) {
                    formData.append(formKey, modelValue, modelValue.name);
                } else if (typeof modelValue === 'object') {
                    this.convertModelToFormData(modelValue, formData, formKey);
                } else {
                    formData.append(formKey, modelValue.toString());
                }
            }
        });

        return formData;
    }
}
